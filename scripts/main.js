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

var fragmentRowTemplate = '<div class="card"><div class="card-header" id="heading{n}" role="tab"><h5 class="mb-0"><a aria-controls="collapse{n}" aria-expanded="true" class="fragment-collapse-btn" data-parent="#accordion" data-toggle="collapse" href="#collapse{n}"></a><div class="form-group start-end-control-panel"><button class="btn btn-sm btn-success modify-start" type="button">-10</button> <button class="btn btn-sm btn-success modify-start" type="button">-1</button> <input class="form-control start-input" value="{start}" step="1"> <button class="btn btn-sm btn-success modify-start" type="button">+1</button> <button class="btn btn-sm btn-success modify-start" type="button">+10</button> <button class="btn btn-sm btn-primary fragment-play" type="button"><i class="fa fa-play"></i></button> <button class="btn btn-sm btn-primary fragment-adjust-end" type="button"><i class="fa fa-angle-double-right"></i></button> <button class="btn btn-sm btn-success modify-end" type="button">-10</button> <button class="btn btn-sm btn-success modify-end" type="button">-1</button> <input class="form-control end-input" value="{end}" step="1"> <button class="btn btn-sm btn-success modify-end" type="button">+1</button> <button class="btn btn-sm btn-success modify-end" type="button">+10</button> <button class="btn btn-sm btn-primary fragment-step" type="button"><i class="fa fa-step-forward"></i></button> <button class="btn btn-sm btn-primary fragment-step-track" type="button"><i class="fa fa-clock-o"></i> <i class="fa fa-step-forward"></i></button> <span class="fragment-title">{title}</span> <button class="btn btn-sm btn-danger fa fa-trash-o fragment-delete" type="button"></button></div></h5></div><div class="collapse show" id="collapse{n}" role="tabpanel" aria-labelledby="heading{n}"><div class="card-block"><div class="form-group"><input class="form-control fragment-description" value="{description}" placeholder="Опишите вопрос фрагмента"> <input class="form-control fragment-tags" value="{tags}" placeholder="Ключевые слова (тэги)"></div></div></div></div>';
var lastFragmentId = 0;
function getFragmentHtml(fragmentData) {
    lastFragmentId++;
    var indexedTemplate = fragmentRowTemplate.replace(/{n}/g, lastFragmentId.toString()).replace(/> /g, ">");

    if (fragmentData === undefined) { // so it is a new fragment

        var startSec = player.getCurrentTime();
        var endSec = startSec;

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
                        request.setRequestHeader("Authorization", "token " + getToken());
                    },
                    url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs",
                    data: JSON.stringify(videoBranchPayload),
                    success: function (branchData) {
                        commitChanges(branchData.object.url, videoData);
                    },
                    error: function(){
                        setToken("");                        
                        refreshAuthBlock();
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
                request.setRequestHeader("Authorization", "token " + getToken());
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
                            request.setRequestHeader("Authorization", "token " + getToken());
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
                                    request.setRequestHeader("Authorization", "token " + getToken());
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
                                            request.setRequestHeader("Authorization", "token " + getToken());
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


function loadFragmentsFromBlob(blobUrl) {
    $("#accordion").empty();
    $.get(blobUrl, function (blobData) {
        var videoJson = decodeURIComponent(atob(blobData.content)).replace(/\+/g, " ");
        var videoData = JSON.parse(videoJson);
        var fragments = videoData.fragments;

        fragments.sort(function (f1, f2) {
            return f1.start - f2.start;
        });
        videoData.fragments.forEach((function (f) {
            addFragmentRowToDom(f);
        }));
        if (videoData.timestamp !== undefined) {
            setFeedback("Отредактировано " + new Date(videoData.timestamp).toLocaleString());
        }
    });
}

function loadVideoData(commitUrl, videoId) {

    $.get(commitUrl, function (commitData) {
        var blobUrl;
        if (commitData.tree !== undefined) {
            $.get(commitData.tree.url, function (treeData) {
                blobUrl = treeData.tree.find(function (f) { return f.path.indexOf(videoId) >= 0; }).url;
                loadFragmentsFromBlob(blobUrl);
            });

        }
        else {
            blobUrl = commitData.files.find(function (f) { return f.filename.indexOf(videoId) >= 0; }).contents_url;
            loadFragmentsFromBlob(blobUrl);
        }
    });

    return false;
}

var commitLiTemplate = '<li class="commitLi"><a href="#" onclick="return loadVideoData(\'{commitUrl}\', \'{videoId}\')">{text}</a></li>';
function loadVideo() {
    $(".video-id-form").fadeOut(500);
    $("#fragmenter-panel").fadeIn(500);
    var videoId = document.getElementById("video-id").value;
    var branchUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + videoId;
    $.ajax({
        type: "GET",
        url: branchUrl,
        success: function (branchData) {
            var commitsUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/commits?sha=" + videoId + "&path=" + videoId + ".json";
            $.get(commitsUrl, function (commits) {
                $("#commitsMenu").empty();
                commits.forEach(function (c) {
                    var commitUrl = c.url;
                    var commitDateUtc = new Date(c.commit.author.date).toLocaleString();
                    var commitLi = commitLiTemplate
                        .replace("{commitUrl}", commitUrl)
                        .replace("{videoId}", videoId)
                        .replace("{text}", commitDateUtc)
                    $("#commitsMenu").append(commitLi);
                });
            });

            loadVideoData(branchData.object.url, videoId);
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
        currentTrackButton.addClass("btn-primary");

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
    currentTrackButton.removeClass("btn-primary");
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
        stopYtTracker();
        fragmentRow.remove();
    });

    $(".fragment-play", fragmentRow).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': document.getElementById("video-id").value,
            'startSeconds': toSeconds($(".start-input", fragmentRow).val())
            // 'endSeconds': currentEnd
        });
    });

    $(".fragment-step", fragmentRow).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': document.getElementById("video-id").value,
            'startSeconds': toSeconds($(".end-input", fragmentRow).val())
            // 'endSeconds': currentEnd
        });
    });

    var endInput = $(".end-input", fragmentRow);
    var startInput = $(".start-input", fragmentRow);

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

    $(".fragment-adjust-end", fragmentRow).click(function () {
        stopYtTracker();
        endInput.val(startInput.val());
    });

    $(".modify-end", fragmentRow).click(function () {
        var dSec = parseInt($(this).text());
        var seconds = toSeconds(endInput.val());
        seconds = seconds + dSec;
        seconds = seconds > 0 ? seconds : 0;
        endInput.val(toHhmmss(seconds));
    });

    $(".modify-start", fragmentRow).click(function () {
        var dSec = parseInt($(this).text());
        var seconds = toSeconds(startInput.val());
        seconds = seconds + dSec;
        seconds = seconds > 0 ? seconds : 0;
        startInput.val(toHhmmss(seconds));
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

function isTokenSet(){
    return document.cookie !== undefined && document.cookie.length === 40;
}

function getToken()
{
    return document.cookie;
}

function setToken(token)
{
    document.cookie = token;
}

function refreshAuthBlock()
{
    if (isTokenSet()){
        $("#authBlock").hide();                
    }
    else{
        $("#authBlock").show();
    }
}

require(["popper"], function (p) {
    window.Popper = p;
    require(["jquery"], function ($) {
        require(["bootstrap", "bootstrap-tagsinput", "typeahead"], function () {

            refreshAuthBlock();

            $("#authButton").click(function(){
                setToken($("#authInput").val());
                refreshAuthBlock();
            });

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