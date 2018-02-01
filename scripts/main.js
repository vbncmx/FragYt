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
        "typeahead": "typeahead.bundle"
    }
};

requirejs.config(options);

var fragmentRowTemplate = '<div class=card><div class=card-header id=heading{n} role=tab><h5 class=mb-0><a aria-controls=collapse{n} aria-expanded=true class=fragment-collapse-btn data-parent=#accordion data-toggle=collapse href=#collapse{n}></a><div class="form-group start-end-control-panel"><input class="form-control start-input"type=time value=00:00> <input class="form-control end-input"type=time value=01:00> <button class="btn fa fa-play fragment-play"type=button></button> <span class=fragment-title></span> <button class="btn fa fa-trash-o fragment-delete"type=button></button></div></h5></div><div class="collapse show"id=collapse{n} role=tabpanel aria-labelledby=heading{n}><div class=card-block><div class=form-group><input class="form-control fragment-description" placeholder="Опишите вопрос фрагмента"> <input class="form-control fragment-tags" placeholder="Введите ключевые слова"></div></div></div></div>';
function getFragmentHtml(fragmentId) {
    return fragmentRowTemplate.replace(/{n}/g, fragmentId.toString());
}

// http://www.levibotelho.com/development/commit-a-file-with-the-github-api/#5a-the-easy-way
function saveChanges() {

    var token = "{token}";

    $.get("https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/master", function (data) {
        var headCommitUrl = data.object.url;
        console.log(headCommitUrl);
        $.get(headCommitUrl, function (headCommit) {

            var payload = {
                "content": "{here_goes_json}",
                "encoding": "utf-8"
            };

            $.ajax({
                type: "POST",
                beforeSend: function (request) {
                    request.setRequestHeader("Authorization", "token " + token);
                },
                url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/blobs",
                data: JSON.stringify(payload),
                success: function (blobData) {
                    $.get(headCommit.tree.url, function (baseTree) {
                        var newTreePayload = {
                            "base_tree": baseTree.sha,
                            "tree": [
                                {
                                    "path": "file_" + Date.now().toString() + ".txt",
                                    "mode": "100644",
                                    "type": "blob",
                                    "sha": blobData.sha
                                }
                            ]
                        };

                        $.ajax({
                            type: "POST",
                            beforeSend: function (request) {
                                request.setRequestHeader("Authorization", "token " + token);
                            },
                            url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/trees",
                            data: JSON.stringify(newTreePayload),
                            success: function (newTree) {
                                var newCommitPayload = {
                                    "message": "Test github API " + Date.now().toString(),
                                    "parents": [headCommit.sha],
                                    "tree": newTree.sha
                                };
                                $.ajax({
                                    type: "POST",
                                    beforeSend: function (request) {
                                        request.setRequestHeader("Authorization", "token " + token);
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
                                                request.setRequestHeader("Authorization", "token " + token);
                                            },
                                            url: "https://api.github.com/repos/vbncmx/vbncmx.github.io/git/refs/heads/master",
                                            data: JSON.stringify(updateRefsPayload),
                                            success: function (result) {
                                                console.log(result);
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
    });
}

require(["popper"], function (p) {
    window.Popper = p;
    require(["jquery"], function ($) {
        require(["bootstrap", "bootstrap-tagsinput", "typeahead"], function () {

            saveChanges();

            var lastFragmentId = 0;

            $("#addFragmentButton").click(function () {
                $('.collapse').collapse('hide');

                lastFragmentId++;
                var html = getFragmentHtml(lastFragmentId);
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
                    alert("PLAY");
                });

                var titleSpan = $(".fragment-title", fragmentRow);
                var descriptionInput = $(".fragment-description", fragmentRow);
                descriptionInput.change(function () {
                    var title = descriptionInput.val();

                    if (title.length > 35) {
                        title = title.substring(0, 31) + " ...";
                    }

                    titleSpan.text(title);
                });
                $(".fragment-description", fragmentRow).focus();
            });
        });
    });
});