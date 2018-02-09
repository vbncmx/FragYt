var options = {
    baseUrl: 'scripts',
    shim: {
        "bootstrap": ['jquery', 'popper'],
        "bootstrap-tagsinput": ['jquery', "typeahead"],
        "typeahead": {
            deps: ['jquery'],
            init: function ($) {
                return require.s.contexts._.registry['typeahead.js'].factory($);
            }
        }
    },
    paths: {
        "githubdb": "js-git/mixins/github-db",
        "jquery": "https://code.jquery.com/jquery-3.3.1.min",
        "popper": "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min",
        "bootstrap": "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min",
        "bootstrap-tagsinput": "bootstrap-tagsinput.min",
        "typeahead": "typeahead.bundle",
        "youtube": "https://www.youtube.com/iframe_api?noext",
    }
};

requirejs.config(options);

var fragmentRowTemplate = '<div class=card><div class=card-header id=heading{n} role=tab><h5 class=mb-0><a aria-controls=collapse{n} aria-expanded=true class=fragment-collapse-btn data-parent=#accordion data-toggle=collapse href=#collapse{n}></a><div class="form-group start-end-control-panel"><button class="btn fragment-start-minus-ten btn-success btn-sm"type=button>-10</button><button class="btn fragment-start-minus-one btn-success btn-sm"type=button>-1</button><input step="1" class="form-control start-input" type="text" value="{start}"><button class="btn fragment-start-plus-one btn-success btn-sm"type=button>+1</button><button class="btn fragment-start-plus-ten btn-success btn-sm"type=button>+10</button><button class="btn fragment-play btn-success btn-sm"type=button><i class="fa fa-play"/></button><input step="1" class="form-control end-input" type="text" value="{end}"><button class="btn fragment-step btn-success btn-sm"type=button><i class="fa fa-step-forward"/></button><button class="btn fragment-step-track btn-success btn-sm"type=button><i class="fa fa-clock-o"/><i class="fa fa-step-forward"/></button> <span class=fragment-title>{title}</span> <button class="btn fa fa-trash-o fragment-delete btn-danger btn-sm"type=button></button></div></h5></div><div class="collapse show"id=collapse{n} role=tabpanel aria-labelledby=heading{n}><div class=card-block><div class=form-group><input class="form-control fragment-description" placeholder="Опишите вопрос фрагмента" value="{description}"> <input class="form-control fragment-tags" placeholder="Ключевые слова (тэги)" value="{tags}"></div></div></div></div>';
var lastFragmentId = 0;
function getFragmentHtml(fragmentData) {
    lastFragmentId++;
    var indexedTemplate = fragmentRowTemplate.replace(/{n}/g, lastFragmentId.toString());

    if (fragmentData === undefined) { // so it is a new fragment

        var startSec = player.getCurrentTime();
        var endSec = startSec + 60;

        return indexedTemplate
            .replace("{description}", "")
            .replace("{start}", toHhmmss(startSec))
            .replace("{end}", toHhmmss(endSec))
            .replace("{tags}", "")
            .replace("{title}", "");
    }

    return indexedTemplate
        .replace("{description}", fragmentData.description)
        .replace("{start}", toHhmmss(fragmentData.start))
        .replace("{end}", toHhmmss(fragmentData.end))
        .replace("{tags}", fragmentData.tags)
        .replace("{title}", getTitle(fragmentData.description));
}

function getFragment(card) {
    var fragment = {
        start: toSeconds(card.find(".start-input").val()),
        end: toSeconds(card.find(".end-input").val()),
        description: card.find(".fragment-description").val(),
        tags: card.find(".fragment-tags").val()
    };
    return fragment;
}

var player;
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
        height: '300',
        width: '480',
        videoId: document.getElementById("video-id").value,
    });
};

function getData() {
    fragments = [];
    $(".card").each(function (index) {
        var card = $(this);
        var fragment = getFragment(card);
        fragments.push(fragment);
    });

    return {
        id: document.getElementById("video-id").value,
        title: player.getVideoData().title,
        timestamp: Date.now(),
        version: "1.0.0.0",
        fragments: fragments
    }
}

function toHhmmss(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds);
    var result = date.toISOString().substr(11, 8);
    return result;
}

function toSeconds(hhmmss) {
    var a = hhmmss.split(':');
    var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
    return seconds;
}

function nowHhmmss() {
    var time = new Date();
    return ("0" + time.getHours()).slice(-2) + ":" +
        ("0" + time.getMinutes()).slice(-2) + ":" +
        ("0" + time.getSeconds()).slice(-2);
}

var ghToken = "{token}";

function saveChanges() {

    var videoData = getData();

    var videoBranchUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + videoData.id;

    $.ajax({
        type: "GET",
        url: videoBranchUrl,
        success: function (branchData) {
            commitChanges(branchData.object.url, videoData);
        },
        error: function () { // there is no branch yet, create it first
            $.get("https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/master", function (masterBranchData) {
                var videoBranchPayload = {
                    ref: "refs/heads/" + videoData.id,
                    sha: masterBranchData.object.sha
                };
                $.ajax({
                    type: "POST",
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", "token " + ghToken);
                    },
                    url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs",
                    data: JSON.stringify(videoBranchPayload),
                    success: function (branchData) {
                        commitChanges(branchData.object.url, videoData);
                    }
                });
            });
        }
    });
}

// http://www.levibotelho.com/development/commit-a-file-with-the-github-api/#5a-the-easy-way
function commitChanges(headCommitUrl, videoData) {

    setFeedback("Сохраняю ...");
    $("#saveButton").attr("disabled", "disabled");

    $.get(headCommitUrl, function (headCommit) {

        var payload = {
            "content": encodeURIComponent(JSON.stringify(videoData)),
            "encoding": "utf-8"
        };

        var file = document.getElementById("video-id").value + ".json";

        $.ajax({
            type: "POST",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "token " + ghToken);
            },
            url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/blobs",
            data: JSON.stringify(payload),
            success: function (blobData) {
                var treeUrl = headCommit.tree.url + "?recursive=1";

                $.get(treeUrl, function (currentTreeData) {

                    var tree = currentTreeData.tree;
                    var file = tree.find(function (f) {
                        return f.path.indexOf(videoData.id) >= 0;
                    });

                    if (file == undefined) {
                        tree.push({
                            "path": videoData.id + ".json",
                            "mode": "100644",
                            "type": "blob",
                            "sha": blobData.sha
                        });
                    }
                    else {
                        file.sha = blobData.sha;
                    }

                    var newTreePayload = {
                        "tree": tree
                    };

                    $.ajax({
                        type: "POST",
                        beforeSend: function (request) {
                            request.setRequestHeader("Authorization", "token " + ghToken);
                        },
                        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/trees",
                        data: JSON.stringify(newTreePayload),
                        success: function (newTree) {
                            var newCommitPayload = {
                                "message": "Save",
                                "parents": [headCommit.sha],
                                "tree": newTree.sha
                            };
                            $.ajax({
                                type: "POST",
                                beforeSend: function (request) {
                                    request.setRequestHeader("Authorization", "token " + ghToken);
                                },
                                url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/commits",
                                data: JSON.stringify(newCommitPayload),
                                success: function (newCommit) {
                                    var updateRefsPayload = {
                                        "sha": newCommit.sha,
                                        "force": true
                                    };

                                    $.ajax({
                                        type: "PATCH",
                                        beforeSend: function (request) {
                                            request.setRequestHeader("Authorization", "token " + ghToken);
                                        },
                                        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + videoData.id,
                                        data: JSON.stringify(updateRefsPayload),
                                        success: function (result) {
                                            setFeedback("Сохранено в " + nowHhmmss());
                                            $("#saveButton").removeAttr("disabled");
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }
        });
    });
}

function loadVideoData(commitUrl, videoId, successFunction) {
    $.get(commitUrl, function (commitData) {
        $.get(commitData.tree.url, function (treeData) {
            var fileBlob = treeData.tree.find(function (f) {
                return f.path.indexOf(videoId) >= 0;
            });
            if (fileBlob !== undefined) {
                var blobUrl = fileBlob.url;
                $.get(fileBlob.url, function (blobData) {
                    var videoJson = decodeURIComponent(atob(blobData.content)).replace(/\+/g, " ");
                    successFunction(JSON.parse(videoJson));
                });
            }
        });
    });
}

function loadVideo() {
    $(".video-id-form").fadeOut(500);
    $("#fragmenter-panel").fadeIn(500);
    var videoId = document.getElementById("video-id").value;
    var videoBranchUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + videoId;
    $.ajax({
        type: "GET",
        url: videoBranchUrl,
        success: function (branchData) {
            loadVideoData(branchData.object.url, videoId, function (videoData) {
                var fragments = videoData.fragments;
                fragments.sort(function (f1, f2) {
                    return f1.start - f2.start;
                });
                videoData.fragments.forEach((function (f) {
                    addFragmentRowToDom(f);
                }));
                if (videoData.timestamp !== undefined) {
                    setFeedback("Отредактировано " + new Date(videoData.timestamp).toString());
                }

            });
        }
    });
    require(["youtube"]);
}

function setFeedback(feedback) {
    $("#feedback_lbl").text(feedback);
}

var ytProgressTracker = null;
var currentTimeInput = null;
var currentTrackButton = null;
function stopYtTracker() {
    if (ytProgressTracker != null) {
        clearInterval(ytProgressTracker);

        currentTimeInput.css("font-weight", "normal");
        currentTrackButton.removeClass("btn-warning");
        currentTrackButton.addClass("btn-success");

        ytProgressTracker = null;
        currentTimeInput = null;
        currentTrackButton = null;
    }
}

function startYtTracker(timeInput, trackButton) {

    stopYtTracker();
    ytProgressTracker = setInterval(function () {
        timeInput.val(toHhmmss(player.getCurrentTime()))
    }, 1000);
    currentTimeInput = timeInput;
    currentTrackButton = trackButton;

    currentTimeInput.css("font-weight", "bold");
    currentTrackButton.removeClass("btn-success");
    currentTrackButton.addClass("btn-warning");
}

function addFragmentRowToDom(fragmentData) {
    $('.collapse').collapse('hide');

    var html = getFragmentHtml(fragmentData);
    var fragmentRow = $(html).hide().prependTo("#accordion").fadeIn(500);
    $(".fragment-tags", fragmentRow).tagsinput({
        typeaheadjs: {
            source: function (query, cb) {
                cb(['Amsterdam', 'Washington', 'Sydney', 'Beijing', 'Cairo']);
            }
        },
        freeInput: true
    });

    $(".fragment-delete", fragmentRow).click(function () {
        fragmentRow.remove();
    });

    $(".fragment-play", fragmentRow).click(function () {
        player.loadVideoById({
            'videoId': document.getElementById("video-id").value,
            'startSeconds': toSeconds($(".start-input", fragmentRow).val())
            // 'endSeconds': currentEnd
        });
    });

    $(".fragment-step", fragmentRow).click(function () {
        player.loadVideoById({
            'videoId': document.getElementById("video-id").value,
            'startSeconds': toSeconds($(".end-input", fragmentRow).val())
            // 'endSeconds': currentEnd
        });
    });

    var endInput = $(".end-input", fragmentRow);
    var trackEndButton = $(".fragment-step-track", fragmentRow);
    trackEndButton.click(function () {
        if (currentTrackButton === trackEndButton) {
            stopYtTracker();
            player.pauseVideo();
        }
        else {
            player.loadVideoById({
                'videoId': document.getElementById("video-id").value,
                'startSeconds': toSeconds($(".end-input", fragmentRow).val())
                // 'endSeconds': currentEnd
            });
            startYtTracker(endInput, trackEndButton);            
        }
    });

    // .fragment-start-minus-one, .fragment-start-minus-ten, .fragment-start-plus-one, .fragment-start-plus-ten{

    var startInput = $(".start-input", fragmentRow);
    $(".fragment-start-minus-one", fragmentRow).click(function(){
        var seconds = toSeconds(startInput.val());
        seconds = seconds >= 1 ? seconds - 1 : 0;
        startInput.val(toHhmmss(seconds));
    });

    $(".fragment-start-minus-ten", fragmentRow).click(function(){
        var seconds = toSeconds(startInput.val());
        seconds = seconds >= 10 ? seconds - 10 : 0;
        startInput.val(toHhmmss(seconds));
    });

    $(".fragment-start-plus-one", fragmentRow).click(function(){
        var seconds = toSeconds(startInput.val());        
        startInput.val(toHhmmss(seconds + 1));
    });

    $(".fragment-start-plus-ten", fragmentRow).click(function(){
        var seconds = toSeconds(startInput.val());        
        startInput.val(toHhmmss(seconds + 10));
    });

    var titleSpan = $(".fragment-title", fragmentRow);
    var descriptionInput = $(".fragment-description", fragmentRow);
    descriptionInput.change(function () {
        var title = getTitle(descriptionInput.val());
        titleSpan.text(title);
    });
    $(".fragment-description", fragmentRow).focus();    
}

function getTitle(description) {
    var title = description;

    if (title.length > 35) {
        title = title.substring(0, 31) + " ...";
    }

    return title;
}


require(["popper"], function (p) {
    window.Popper = p;
    require(["jquery"], function ($) {
        require(["bootstrap", "bootstrap-tagsinput", "typeahead"], function () {

            $("#load-yt-video").click(function () {
                loadVideo();
            });

            $("#saveButton").click(function () {
                saveChanges();
            });

            $("#addFragmentButton").click(function () {
                addFragmentRowToDom();
                player.pauseVideo();
            });
        });
    });
});