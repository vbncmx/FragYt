var version = "0.0.0.19";

var videoStatus = {
    New: "Новое видео",
    Editing: "В обработке",
    Submitted: "На рассмотрении",
    Accepted: "Принято",
    Rejected: "Снято с рассмотрения",
    CouldNotLoad: "Не удалось загрузить статус"
};
var currentVideoStatus = videoStatus.CouldNotLoad;

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
        "jquery": "https://code.jquery.com/jquery-3.3.1.min",
        "popper": "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min",
        "bootstrap": "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min",
        "bootstrap-tagsinput": "bootstrap-tagsinput.min",
        "typeahead": "typeahead.bundle",
        "youtube": "https://www.youtube.com/iframe_api?noext",
        "git-connect": "git-connect"
    }
};

requirejs.config(options);

var fragmentEditorTemplate = '<div class="fragment-editor"><div class="input-group-xs"><strong>Начало:</strong> <button class="btn btn-sq btn-xs btn-success modify-start"type="button">-10</button> <button class="btn btn-sq btn-xs btn-success modify-start"type="button">-1</button> <input class="form-control start-input"value="{start}"step="1"type="text"> <button class="btn btn-sq btn-xs btn-success modify-start"type="button">+1</button> <button class="btn btn-sq btn-xs btn-success modify-start"type="button">+10</button> <strong>Конец:</strong> <button class="btn btn-sq btn-xs btn-success modify-end"type="button">-10</button> <button class="btn btn-sq btn-xs btn-success modify-end"type="button">-1</button> <input class="form-control end-input"value="{end}"step="1"type="text"> <button class="btn btn-sq btn-xs btn-success modify-end"type="button">+1</button> <button class="btn btn-sq btn-xs btn-success modify-end"type="button">+10</button> <button class="btn btn-sq btn-xs btn-primary fragment-step-track"type="button"><i class="fa fa-clock-o"></i> <i class="fa fa-step-forward"></i></button> <button class="btn btn-sq btn-xs btn-primary fragment-step"type="button"><i class="fa fa-step-forward"></i></button></div><input class="form-control fragment-description"value="{description}"placeholder="Опишите вопрос фрагмента"> <input class="form-control fragment-tags"value="{tags}"placeholder="Ключевые слова (тэги)"></div>';
var lastFragmentId = 0;
function getFragmentEditorHtml(fragmentData) {
    lastFragmentId++;
    var indexedTemplate = fragmentEditorTemplate.replace(/{n}/g, lastFragmentId.toString()).replace(/> /g, ">");

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
        .replace("{title}", short(fragmentData.description));
}

function getFragmentEncoded(card) {
    var fragment = {
        start: toSeconds(card.find(".start-input").val()),
        end: toSeconds(card.find(".end-input").val()),
        description: encodeURIComponent(card.find(".fragment-description").val()),
        tags: encodeURIComponent(card.find(".fragment-tags").val())
    };
    return fragment;
}

var player;
var currentVideoId;
var currentFragments;
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
        height: '300',
        width: '480',
        videoId: currentVideoId,
    });
};

function getDataEncoded() {

    if (currentVideoId === undefined || currentVideoId === null || currentVideoId.length < 1) {
        return undefined;
    }

    fragments = [];
    currentFragments.forEach(function(f) {
        fragments.push({
            start: f.start,
            end: f.end,
            description: encodeURIComponent(f.description),
            tags: encodeURIComponent(f.tags)
        });
    });

    return {
        id: currentVideoId,
        title: encodeURIComponent(player.getVideoData().title),
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

    var videoData = getDataEncoded();

    var branchName = getBranchName(videoData.id);
    var videoBranchUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + branchName;

    $.ajax({
        type: "GET",
        url: videoBranchUrl,
        success: function (branchData) {
            commitChanges(branchData.object.url, videoData);
        },
        error: function () { // there is no branch yet, create it first
            $.get("https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/master", function (masterBranchData) {
                var videoBranchPayload = {
                    ref: "refs/heads/" + branchName,
                    sha: masterBranchData.object.sha
                };
                $.ajax({
                    type: "POST",
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", "token " + getAuthData().token);
                    },
                    url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs",
                    data: JSON.stringify(videoBranchPayload),
                    success: function (branchData) {
                        commitChanges(branchData.object.url, videoData);
                    },
                    error: function () {
                        setAuthData("");
                        refreshAuthBlock();
                    }
                });
            });
        }
    });
}

// http://www.levibotelho.com/development/commit-a-file-with-the-github-api/#5a-the-easy-way
function commitChanges(headCommitUrl, videoData) {

    log("Сохраняю ...");
    $("#saveButton").attr("disabled", "disabled");

    $.get(headCommitUrl, function (headCommit) {

        var payload = {
            "content": JSON.stringify(videoData),
            "encoding": "utf-8"
        };

        $.ajax({
            type: "POST",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "token " + getAuthData().token);
            },
            url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/blobs",
            data: JSON.stringify(payload),
            success: function (blobData) {
                var treeUrl = headCommit.tree.url + "?recursive=1";

                $.get(treeUrl, function (currentTreeData) {

                    var tree = [];
                    currentTreeData.tree.forEach(function (i) {
                        if (i.path != "data") {
                            tree.push(i);
                        }
                    });

                    var file = tree.find(function (f) {
                        return f.path.indexOf(videoData.id) >= 0;
                    });

                    if (file == undefined) {
                        tree.push({
                            "path": "data/" + videoData.id + ".json",
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
                            request.setRequestHeader("Authorization", "token " + getAuthData().token);
                        },
                        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/trees",
                        data: JSON.stringify(newTreePayload),
                        success: function (newTree) {
                            var newCommitPayload = {
                                "message": decodeURIComponent(videoData.title),
                                "parents": [headCommit.sha],
                                "tree": newTree.sha
                            };
                            $.ajax({
                                type: "POST",
                                beforeSend: function (request) {
                                    request.setRequestHeader("Authorization", "token " + getAuthData().token);
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
                                            request.setRequestHeader("Authorization", "token " + getAuthData().token);
                                        },
                                        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + getBranchName(videoData.id),
                                        data: JSON.stringify(updateRefsPayload),
                                        success: function (result) {
                                            log("Сохранено в " + nowHhmmss());
                                            $("#saveButton").removeAttr("disabled");
                                            refreshVideoList();
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

function forPullRequests(videoId, prsFunction) {
    var branchName = getBranchName(videoId);
    var prsUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/pulls?state=all&sort=created&direction=desc&head=" + branchName;
    $.ajax({
        type: "GET",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "token " + getAuthData().token);
        },
        url: prsUrl,
        success: function (prsData) {
            prsData = prsData.filter(function (pr) {
                return pr.head.ref == branchName;
            });
            prsFunction(prsData);
        },
        error: function () {
            prsFunction(undefined);
        }
    });
}

function getVideoStatus(videoId, statusFunction) {

    var branchName = getBranchName(videoId);
    var branchUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/" + branchName;
    $.ajax({
        type: "GET",
        url: branchUrl,
        success: function (branchData) {
            forPullRequests(videoId, function (prsData) {
                if (prsData === undefined) {
                    statusFunction(videoStatus.CouldNotLoad, branchData);
                }
                else if (prsData.length == 0) {
                    statusFunction(videoStatus.Editing, branchData);
                }
                else {
                    var openedPrs = prsData.filter(function (pr) { return pr.state == "open"; });
                    if (openedPrs.length > 0) {
                        statusFunction(videoStatus.Submitted, branchData);
                    }
                    else {
                        var latestPr = prsData[0];
                        if (latestPr.merged_at !== null) {
                            statusFunction(videoStatus.Accepted, branchData)
                        }
                        else {
                            $.ajax({
                                type: "GET",
                                beforeSend: function (request) {
                                    request.setRequestHeader("Authorization", "token " + getAuthData().token);
                                },
                                url: latestPr.comments_url,
                                success: function (commentsData) {
                                    statusFunction(videoStatus.Rejected, branchData, commentsData);
                                }
                            });
                        }
                    }
                }
            });
        },
        error: function () {
            statusFunction(videoStatus.New);
        }
    });
}


function loadFragmentsFromBlob(blobUrl) {
    $.get(blobUrl, function (blobData) {
        var videoJson = atob(blobData.content);
        var videoData = JSON.parse(videoJson);
        videoData.title = decodeURIComponent(videoData.title).replace(/\+/g, " ");
        var fragments = videoData.fragments;
        fragments.forEach(function (f) {
            f.description = decodeURIComponent(f.description).replace(/\+/g, " ");
            f.tags = decodeURIComponent(f.tags).replace(/\+/g, " ");
        })

        fragments.sort(function (f1, f2) {
            return f1.start - f2.start;
        });
        videoData.fragments.forEach((function (f) {
            addFragmentLiToMenu(f);
        }));
        if (videoData.timestamp !== undefined) {
            log("Загружено \"" + videoData.title + "\" от " + new Date(videoData.timestamp).toLocaleString());
        }
    });
}

function loadVideoData(commitUrl, videoId) {

    $("#fragmentMenu").empty();
    currentFragments = [];

    $.get(commitUrl, function (commitData) {
        var blobUrl;
        if (commitData.tree !== undefined) {
            $.get(commitData.tree.url, function (treeData) {
                dataUrl = treeData.tree.find(function (f) { return f.path == "data"; }).url;
                $.get(dataUrl, function (dataFolderData) {
                    blobUrl = dataFolderData.tree.find(function (f) { return f.path.indexOf(videoId) >= 0; }).url;
                    loadFragmentsFromBlob(blobUrl);
                });
            });
        }
        else {
            blobUrl = commitData.files.find(function (f) { return f.filename.indexOf(videoId) >= 0; }).contents_url;
            loadFragmentsFromBlob(blobUrl);
        }
    });

    return false;
}


var videoLiTemplate = '<a href="#" onclick="return loadVideo(\'{videoId}\')">{text}</a>';
function refreshVideoList() {
    $("#videoList").empty();
    $.get("https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs", function (refsData) {

        var branchPrefix = getBranchPrefix();
        refsData.forEach(function (r) {

            var branchPrefixIndex = r.ref.indexOf(branchPrefix);
            if (branchPrefixIndex < 0) return;
            var videoIdIndex = branchPrefixIndex + branchPrefix.length;
            var videoId = r.ref.substring(videoIdIndex);

            $.get(r.object.url, function (headCommitData) {
                var text = short(headCommitData.message, 40) + " (" + videoId + ")";
                var videoLiHtml = videoLiTemplate
                    .replace("{videoId}", videoId)
                    .replace("{text}", text);
                $("#videoList").append(videoLiHtml);
            });

        });
    });
}

function refreshPrButton() {
    var prButton = $("#prButton");
    if (currentVideoStatus === videoStatus.Submitted) {
        prButton.text("Снять с рассмотрения");
    }
    else {
        prButton.text("Отправить на рассмотрение");
    }

    var s = currentVideoStatus;
    if (s === videoStatus.Editing || s === videoStatus.Rejected || s === videoStatus.Accepted || s === videoStatus.Submitted) {
        prButton.removeAttr("disabled");
    }
    else {
        prButton.attr("disabled", "disabled");
    }
}

var prButtonInterval = null;
function startPrButtonInterval() {
    if (prButtonInterval !== null) {
        stopPrButtonInterval();
    }

    var countdown = 120;
    $("#prButton").attr("disabled", "disabled");
    prButtonInterval = setInterval(function () {
        if (countdown == 0) {
            stopPrButtonInterval();
        } else {
            $("#prButton").text(countdown.toString());
            countdown--;
        }
    }, 1000);
}

function stopPrButtonInterval() {
    if (prButtonInterval !== null) {
        clearInterval(prButtonInterval);
        prButtonInterval = null;
        refreshPrButton();
    }
}

var commitLiTemplate = '<li class="commitLi"><a href="#" onclick="return loadVideoData(\'{commitUrl}\', \'{videoId}\')">{text}</a></li>';
function loadVideo(videoId) {

    currentFragments = [];
    toggleSidebar();

    stopPrButtonInterval();
    $("#accordion").empty();
    $("#commitsMenu").empty();
    currentVideoId = videoId;

    log("Загружаю видео " + videoId);
    getVideoStatus(videoId, function (status, branchData, comments) {
        currentVideoStatus = status;
        refreshPrButton();
        var statusLog = "Статус видео - " + status;
        if (status == videoStatus.Rejected) {
            if (comments.length === 0) {
                statusLog += " без комментариев";
            }
            else {
                statusLog += " с комментариями: ";
                comments.forEach(function (c) {
                    statusLog += c.user.login + ": " + c.body + ", ";
                });
                statusLog = statusLog.substring(0, statusLog.length - 2);
            }
        }
        log(statusLog);

        var branchName = getBranchName(currentVideoId);
        var commitsUrl = "https://api.github.com/repos/vbncmx/vbncmx.github.io/commits?sha=" + branchName + "&path=data/" + videoId + ".json";
        $.get(commitsUrl, function (commits) {
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
    });

    if (player == undefined) {
        require(["youtube"]);
    }
    else {
        player.loadVideoById({
            'videoId': currentVideoId
        });
    }

    return false;
}

function log(feedback) {

    var text = $("#logArea").text();
    if (text !== undefined && text !== "") {
        text = feedback + "\n" + text;
    }
    else {
        text = feedback;
    }
    $("#logArea").text(text);
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
        timeInput.val(toHhmmss(player.getCurrentTime()));
        timeInput.trigger("input");
    }, 1000);
    currentTimeInput = timeInput;
    currentTrackButton = trackButton;

    currentTimeInput.css("font-weight", "bold");
    currentTrackButton.removeClass("btn-primary");
    currentTrackButton.addClass("btn-warning");
}


var fragmentLiTemplate = '<li class="fragment-li list-group-item"id="fragment-li-{index}"><table class="fragment-li-buttons"><tr><td><a class="fragmentPlayLink"href="#"><i class="fa fa-play"></i></a></td><td class="fragmentLiTextTd">{text}</td><td><a class="fragmentRemoveLink"href="#"><i class="fa fa-times"></i></a></td></tr></table></li>';
function addFragmentLiToMenu(fragmentData) {

    currentFragments.push(fragmentData);

    var fragmentIndex = currentFragments.indexOf(fragmentData);

    var fragmentLiHtml = fragmentLiTemplate
        .replace("{text}", short(fragmentData.description))
        .replace("{index}", fragmentIndex);
    var fragmentLi = $(fragmentLiHtml).hide().prependTo("#fragmentMenu").fadeIn(500);

    fragmentLi.click(function () { selectFragment(fragmentData, fragmentLi); });

    return fragmentLi;
}

function selectFragment(fragmentData, fragmentLi) {
    $(".fragment-li").removeClass("active");
    fragmentLi.addClass("active");
    initializeFragmentEditor(fragmentData, fragmentLi);
}

function initializeFragmentEditor(fragmentData, fragmentLi) {

    $(".fragmentEditorTd").empty();

    var editorHtml = getFragmentEditorHtml(fragmentData);
    var editor = $(editorHtml).hide().prependTo(".fragmentEditorTd").fadeIn(500);
    var tagsInput = $(".fragment-tags", editor);
    tagsInput.tagsinput({
        // typeaheadjs: {
        //     source: function (query, cb) {
        //         cb(['Amsterdam', 'Washington', 'Sydney', 'Beijing', 'Cairo']);
        //     }
        // },
        freeInput: true
    });

    $(".fragment-play", editor).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': currentVideoId,
            'startSeconds': toSeconds($(".start-input", editor).val())
            // 'endSeconds': currentEnd
        });
    });

    $(".fragment-step", editor).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': currentVideoId,
            'startSeconds': toSeconds($(".end-input", editor).val())
            // 'endSeconds': currentEnd
        });
    });

    var endInput = $(".end-input", editor);
    var startInput = $(".start-input", editor);

    var trackEndButton = $(".fragment-step-track", editor);
    trackEndButton.click(function () {
        if (currentTrackButton === trackEndButton) {
            stopYtTracker();
            player.pauseVideo();
        }
        else {
            player.loadVideoById({
                'videoId': currentVideoId,
                'startSeconds': toSeconds($(".end-input", editor).val())
                // 'endSeconds': currentEnd
            });
            startYtTracker(endInput, trackEndButton);
        }
    });

    $(".fragment-adjust-end", editor).click(function () {
        stopYtTracker();
        endInput.val(startInput.val());
    });

    $(".modify-end", editor).click(function () {
        var dSec = parseInt($(this).text());
        var seconds = toSeconds(endInput.val());
        seconds = seconds + dSec;
        seconds = seconds > 0 ? seconds : 0;
        endInput.val(toHhmmss(seconds));
        endInput.trigger("input");
    });

    $(".modify-start", editor).click(function () {
        var dSec = parseInt($(this).text());
        var seconds = toSeconds(startInput.val());
        seconds = seconds + dSec;
        seconds = seconds > 0 ? seconds : 0;
        startInput.val(toHhmmss(seconds));
        startInput.trigger("input");
    });

    var titleSpan = $(".fragment-title", editor);
    var descriptionInput = $(".fragment-description", editor);
    descriptionInput.change(function () {
        var title = short(descriptionInput.val());
        titleSpan.text(title);
    });

    $(".fragment-description", editor).focus();

    var applyFunction = function () {
        fragmentData.description = descriptionInput.val();
        fragmentData.start = toSeconds(startInput.val());
        fragmentData.end = toSeconds(endInput.val());
        fragmentData.tags = tagsInput.val();
        fragmentLi.find(".fragmentLiTextTd").html(short(fragmentData.description));
    };

    startInput.on("focusout change input", applyFunction);
    endInput.on("focusout change input", applyFunction);
    descriptionInput.on("focusout change input", applyFunction);
    tagsInput.on("focusout change input", applyFunction);
}

function short(text, nSymbols = 35) {
    var short = text;

    if (short.length > nSymbols) {
        short = short.substring(0, nSymbols - 4) + " ...";
    }

    return short;
}

function isAuthDataValid() {
    return getAuthData() !== undefined;
}



function setAuthData(authData) {
    log("Сохраняю имя пользователя и токен");
    document.cookie = JSON.stringify(authData);
    log("Имя пользователя и токен сохранены");
}

function refreshAuthBlock() {
    var authData = getAuthData();
    if (authData !== undefined) {
        $("#loginInput").val(authData.login);
        $("#tokenInput").val(authData.token);
    }
}

function getBranchName(videoId) {
    return getBranchPrefix() + videoId;
}

function getBranchPrefix() {
    var authData = getAuthData();
    return authData.login + "_";
}

function closePullRequest(videoId) {

    log("Снимаю видео с рассмотрения");

    forPullRequests(videoId, function (prsData) {
        var openPrs = prsData.filter(function (pr) { return pr.state == "open"; });
        openPrs.forEach(function (pr) {
            var payload = {
                state: "closed"
            };
            $.ajax({
                type: "PATCH",
                beforeSend: function (request) {
                    request.setRequestHeader("Authorization", "token " + getAuthData().token);
                },
                url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/pulls/" + pr.number,
                data: JSON.stringify(payload),
                success: function (prData) {
                    currentVideoStatus = videoStatus.Rejected;
                    startPrButtonInterval();
                    log("Видео снято с рассмотрения");
                },
                error: function () {
                    log("Не удалось снять видео с рассмотрения");
                }
            });
        });
    });
}


function submitPullRequest(videoData) {
    var branchName = getBranchName(videoData.id);
    var body = "";

    videoData.fragments.forEach(function (f) {
        body += toHhmmss(f.start) + " - " + toHhmmss(f.end) + ": " + f.description + "<br>";
    });

    var payload = {
        "title": videoData.title + "(" + videoData.id + ")",
        "body": body,
        "head": branchName,
        "base": "master"
    }

    log("Отправляю видео на рассмотрение");

    $.ajax({
        type: "POST",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "token " + getAuthData().token);
        },
        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/pulls",
        data: JSON.stringify(payload),
        success: function (prData) {
            log("Видео отправлено на рассмотрение");
            currentVideoStatus = videoStatus.Submitted;
            startPrButtonInterval();
        },
        error: function () {
            log("Не удалось отправить видео на рассмотрение");
        }
    });
}

function parseOutVideoId(videoUrl) {
    var vEqualIndex = videoUrl.indexOf("?v=");
    if (vEqualIndex > 0) {
        videoUrl = videoUrl.substring(vEqualIndex + 3, vEqualIndex + 3 + 11);
    }
    else {
        var questionIndex = videoUrl.indexOf("?");
        if (questionIndex > 0) {
            videoUrl = videoUrl.substring(0, questionIndex);
        }
        var forwardSlashIndex = videoUrl.lastIndexOf("/");
        videoUrl = videoUrl.substring(forwardSlashIndex + 1);
    }

    return videoUrl;
}


var authData = {
    login: '',
    token: ''
};
function getAuthData() {
    return authData;
}

var isInitialized = false;
function refreshLockerBlock() {

    $("#connectButton").hide();
    $("#collabWrapper").hide();
    $("#collabButton").hide();
    $("#collabLabel").hide();
    $("#lockerBlock").show();

    if (!window.connection().isConnected()) {

        $("#collabWrapper").hide();
        $("#connectButton").show();

    }
    else { // check if user is collaborator

        $("#connectButton").hide();
        $("#collabWrapper").show();
        $("#collabButton").hide();
        $("#collabLabel").show();
        $("#collabLabel").html("Проверяю репозиторий");

        $.ajax({
            type: "GET",
            beforeSend: function (request) {
                request.setRequestHeader("Authorization", "token " + getAuthData().token);
            },
            url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/collaborators/" + getAuthData().login,
            success: function (collaboratorsResponse) { // user is collaborator

                $("#lockerBlock").hide();

                if (!isInitialized) {
                    initialize();
                }
            },
            error: function (response) { // user is not collaborator
                var collabRequestDateMs = localStorage.getItem("COLLAB_REQUEST_DATE_MS");
                if (collabRequestDateMs === null) { // collab request was not sent yet

                    $("#collabButton").show();
                    $("#collabLabel").show();
                    $("#collabLabel").html("Необходимо присоединиться к репозиторию");

                }
                else { // collab request was sent

                    $("#collabButton").hide();
                    $("#collabLabel").hide();

                    var issueUrl = localStorage.getItem("COLLAB_REQUEST_ISSUE_URL");
                    $.get(issueUrl, function (issueData) {
                        if (issueData.state === "closed") {
                            if (issueData.comments > 0) {
                                $.get(issueData.comments_url, function (comments) {
                                    var message = "Ваш запрос на присоединение к репозиторию закрыт с комментариями:";
                                    comments.forEach(function (c) {
                                        var wrap = function (str) { return '<a target="_blank" href="' + str + '">' + str + '<\/a>'; };
                                        var commentLine = "<br>" + c.user.login + ": " + c.body.replace(/\bhttp[^ ]+/ig, wrap);
                                        message += commentLine;
                                    });
                                    $("#collabLabel").html(message);
                                    $("#collabLabel").show();
                                });
                            }
                            else {
                                $("#collabLabel").html("Ваш запрос на присоединение к репозиторию закрыт без комментариев");
                                $("#collabLabel").show();
                            }
                        }
                        else {
                            $("#collabLabel").html("Ваш запрос на присоединение к репозиторию в рассмотрении");
                            $("#collabLabel").show();
                        }
                    });
                }
            }
        });
    }
}

function sendCollabRequest() {

    var payload = {
        title: "Пожалуйста добавьте меня в Collaborators"
    };

    $.ajax({
        type: "POST",
        beforeSend: function (request) {
            request.setRequestHeader("Authorization", "token " + getAuthData().token);
        },
        url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/issues",
        data: JSON.stringify(payload),
        success: function (issueData) {
            localStorage.setItem("COLLAB_REQUEST_DATE_MS", Date.now());
            localStorage.setItem("COLLAB_REQUEST_ISSUE_URL", issueData.url);
            refreshLockerBlock();
        },
        error: function (jqXHR, error, errorThrown) {
            var messageText = "Ошибка. ";
            if (jqXHR.status && jqXHR.status == 400) {
                messageText += jqXHR.responseText;
            }
            $("#collabLabel").html(messageText);
        }
    });
}

function connectToGitHub() {
    $("#connectButton").attr("disabled", "disabled");
    setTimeout(function () {
        $("#connectButton").removeAttr("disabled");
    }, 5000);
    window.connection().connect();
}

function initialize() {

    refreshVideoList();

    $("#profileBtn").click(function () {
        if ($("#authBlock").is(":visible")) {
            $("#authBlock").hide();
        }
        else {
            $("#authBlock").show();
        }
    });

    $("#addVideoBtn").click(function () {
        var videoUrl = prompt("Укажите URL видео с Youtube:");
        if (videoUrl === undefined || videoUrl === null) {
            return false;
        }

        var videoId = parseOutVideoId(videoUrl);

        loadVideo(videoId);
    });

    $("#saveButton").click(function () {
        $("#saveButton").attr("disabled", "disabled");
        saveChanges();
    });

    $("#addFragmentButton").click(function () {
        player.pauseVideo();
        var fragmentData = {
            description: "",
            tags: "",
            start: player.getCurrentTime(),
            end: player.getCurrentTime()
        };
        var fragmentLi = addFragmentLiToMenu(fragmentData);
        selectFragment(fragmentData, fragmentLi);
    });

    $('#myVideoSearch').on('keyup', function () {
        var searchTerm = $(this).val().toLowerCase();
        $('.videoLi').each(function () {
            if ($(this).filter('[data-search-term *= ' + searchTerm + ']').length > 0 || searchTerm.length < 1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    $("#prButton").click(function () {
        var s = currentVideoStatus;
        if (s === videoStatus.Editing || s === videoStatus.Rejected || s === videoStatus.Accepted) {
            var videoData = getDataEncoded();
            if (videoData === undefined) {
                return;
            }
            submitPullRequest(videoData);
        }
        else if (s === videoStatus.Submitted) {
            closePullRequest(currentVideoId);
        }
    });

    $(".tutorial-link").click(function () {

        var videoUrl = $(this).attr("href")
        var videoId = parseOutVideoId(videoUrl);
        currentVideoId = videoId;

        if (player == undefined) {
            require(["youtube"]);
        }
        else {
            player.loadVideoById({
                'videoId': videoId
            });
        }

        return false;
    });

    isInitialized = true;
}

require(["popper"], function (p) {
    window.Popper = p;
    require(["jquery"], function ($) {
        require(["bootstrap", "bootstrap-tagsinput", "typeahead", "git-connect"], function () {

            console.log("FragYt version: " + version);

            document.addEventListener("IsConnectedToGithubEvent", function (e) {
                e.detail.withCredentials(function (username, user_info, access_token) {

                    authData.login = user_info;
                    authData.token = access_token;

                    $("#disconnectLink").click(function () {
                        e.detail.disconnect();
                        return false;
                    });
                    $("#disconnectSpan").show();
                    $("#login").html(authData.login);

                    refreshLockerBlock();

                });
            });

            document.addEventListener("IsDisconnectedFromGithubEvent", function (e) {

                $("#disconnectSpan").hide();

                refreshLockerBlock();

            });

            window.connection({
                client_id: "8511d6cee6210c7b9420", //required; your application `client_id` in Github
                proxy: "https://wow-git-proxy.herokuapp.com", //required; Base_URI to your git-proxy server
                expires: 7,  //optional, default: 7; the number of days after coockies expire        
                owner: 'vbncmx',  //application owner's github username
                reponame: 'vbncmx.github.io', //application's repository name
            });
        });
    });
});

function toggleSidebar() {

    var sidebar = $("#sidebar");

    var marginLeft = parseInt(sidebar.css("margin-left").replace("px", ""));
    console.log(marginLeft);
    if (marginLeft === 0) {
        sidebar.animate({
            marginLeft: "-500px"
        }, 1000);
    }
    else {
        sidebar.css("margin-left", "-500px");
        sidebar.animate({
            marginLeft: "0px"
        }, 1000);
    }

    return false;
}