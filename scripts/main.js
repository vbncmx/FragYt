var videoStatus = {
    New: "Новое видео",
    Editing: "В обработке",
    Submitted: "На рассмотрении",
    Accepted: "Принято",
    Rejected: "Снято с рассмотрения",
    CouldNotLoad: "Не удалось загрузить статус"
};
var currentVideoStatus = videoStatus.CouldNotLoad;

var sha256 = function a(b) { function c(a, b) { return a >>> b | a << 32 - b } for (var d, e, f = Math.pow, g = f(2, 32), h = "length", i = "", j = [], k = 8 * b[h], l = a.h = a.h || [], m = a.k = a.k || [], n = m[h], o = {}, p = 2; 64 > n; p++)if (!o[p]) { for (d = 0; 313 > d; d += p)o[d] = p; l[n] = f(p, .5) * g | 0, m[n++] = f(p, 1 / 3) * g | 0 } for (b += "\x80"; b[h] % 64 - 56;)b += "\x00"; for (d = 0; d < b[h]; d++) { if (e = b.charCodeAt(d), e >> 8) return; j[d >> 2] |= e << (3 - d) % 4 * 8 } for (j[j[h]] = k / g | 0, j[j[h]] = k, e = 0; e < j[h];) { var q = j.slice(e, e += 16), r = l; for (l = l.slice(0, 8), d = 0; 64 > d; d++) { var s = q[d - 15], t = q[d - 2], u = l[0], v = l[4], w = l[7] + (c(v, 6) ^ c(v, 11) ^ c(v, 25)) + (v & l[5] ^ ~v & l[6]) + m[d] + (q[d] = 16 > d ? q[d] : q[d - 16] + (c(s, 7) ^ c(s, 18) ^ s >>> 3) + q[d - 7] + (c(t, 17) ^ c(t, 19) ^ t >>> 10) | 0), x = (c(u, 2) ^ c(u, 13) ^ c(u, 22)) + (u & l[1] ^ u & l[2] ^ l[1] & l[2]); l = [w + x | 0].concat(l), l[4] = l[4] + w | 0 } for (d = 0; 8 > d; d++)l[d] = l[d] + r[d] | 0 } for (d = 0; 8 > d; d++)for (e = 3; e + 1; e--) { var y = l[d] >> 8 * e & 255; i += (16 > y ? 0 : "") + y.toString(16) } return i };

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
var currentVideoId;
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
        height: '300',
        width: '480',
        videoId: currentVideoId,
    });
};

function getData() {

    if (currentVideoId === undefined || currentVideoId === null || currentVideoId.length < 1) {
        return undefined;
    }

    fragments = [];
    $(".card").each(function (index) {
        var card = $(this);
        var fragment = getFragment(card);
        fragments.push(fragment);
    });

    return {
        id: currentVideoId,
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
            "content": encodeURIComponent(JSON.stringify(videoData)),
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
                                "message": videoData.title,
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
        success: prsFunction,
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
            log("Загружено \"" + videoData.title + "\" от " + new Date(videoData.timestamp).toLocaleString());
        }
    });
}

function loadVideoData(commitUrl, videoId) {

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


var videoLiTemplate = '<li data-search-term="{data-search-term}" class="videoLi"><a href="#" onclick="return loadVideo(\'{videoId}\')">{text}</a></li>';
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
                var text = headCommitData.message + " (" + videoId + ")";
                var videoLiHtml = videoLiTemplate
                    .replace("{videoId}", videoId)
                    .replace("{text}", text)
                    .replace("{data-search-term}", text.toLowerCase());
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
        // typeaheadjs: {
        //     source: function (query, cb) {
        //         cb(['Amsterdam', 'Washington', 'Sydney', 'Beijing', 'Cairo']);
        //     }
        // },
        freeInput: true
    });

    $(".fragment-delete", fragmentRow).click(function () {
        stopYtTracker();
        fragmentRow.remove();
    });

    $(".fragment-play", fragmentRow).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': currentVideoId,
            'startSeconds': toSeconds($(".start-input", fragmentRow).val())
            // 'endSeconds': currentEnd
        });
    });

    $(".fragment-step", fragmentRow).click(function () {
        stopYtTracker();
        player.loadVideoById({
            'videoId': currentVideoId,
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
                'videoId': currentVideoId,
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
    return sha256(authData.login) + "_";
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

require(["popper"], function (p) {
    window.Popper = p;
    require(["jquery"], function ($) {
        require(["bootstrap", "bootstrap-tagsinput", "typeahead", "git-connect"], function () {

            var connection = window.connection({
                client_id: "8511d6cee6210c7b9420", //required; your application `client_id` in Github
                proxy: "http://wow-git-proxy.herokuapp.com", //required; Base_URI to your git-proxy server
                expires: 7,  //optional, default: 7; the number of days after coockies expire        
                owner: 'vbncmx',  //application owner's github username
                reponame: 'vbncmx.github.io', //application's repository name
            });

            if (!connection.isConnected()) {
                connection.connect();
                return;
            }

            connection.withCredentials(function (err, username, access_token, user_info) {
                authData.login = username;
                authData.token = access_token;

                console.log(username);
                console.log(access_token);

                return;

                refreshVideoList();

                $.ajax({
                    type: "GET",
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", "token " + getAuthData().token);
                    },
                    url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/collaborators/" + getAuthData().login,
                    success: function (response) {
                        log("Вы участвуете в репозитории");
                    },
                    error: function (response) {
                        log("Вы не участвуете в репозитории");
                    }
                });

                $("#profileBtn").click(function () {
                    if ($("#authBlock").is(":visible")) {
                        $("#authBlock").hide();
                    }
                    else {
                        $("#authBlock").show();
                    }
                });

                $("#collabButton").click(function () {

                    log("Отправляю запрос на добавление в Collaborators");

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
                        success: function (response) {
                            console.log(response);
                            log("Запрос отправлен");
                        }
                    });
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
                    saveChanges();
                });

                $("#addFragmentButton").click(function () {
                    addFragmentRowToDom();
                    player.pauseVideo();
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
                        var videoData = getData();
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
            });
        });
    });
});