// ==UserScript==
// @name         michaelfm1211's Moderation Fast Actions
// @namespace    https://github.com/michaelfm1211/stackoverflow-userscripts
// @version      0.1
// @description  Faster actions for common moderation tasks.
// @author       Michael M
// @match        https://stackoverflow.com/questions/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stackoverflow.com
// @grant        none
// ==/UserScript==

///
// Utilities
///

const privs = {
    flag: 15,
    comment: 500,
    dv: 125,
    edit: 2000,
    cv: 3000,
    tagEdit: 10000,
};

// Check if the user has a specific privelege
function can(priv) {
    const repEl = document.querySelector('.js-header-rep');
    const rep = parseInt([...repEl.childNodes[0].textContent].filter(ch => '0123456789'.contains(ch)).join(''));
    return rep >= priv;
}

// https://stackoverflow.com/a/57395241/13376511
function waitForEl(sel) {
    return new Promise((resolve, reject) => {
        var observer = new MutationObserver(function(mutations) {
            if (document.querySelector(sel) !== null) {
                observer.disconnect();
                resolve();
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    });
}

// Checks if question is not closed
function not_closed() {
    return document.querySelector('.js-close-question-link').textContent.contains('Close');
}

// Create bars for the comment actions
function create_comment_bars() {
    const commentLinks = [...document.querySelectorAll('.comments-link:not(.dno)')];
    console.log(commentLinks)
    const containers = commentLinks.map(commentLink => {
        const container = document.createElement('span');
        container.style.float = 'right';
        return commentLink.insertAdjacentElement('afterend', container)
    });
    return containers;
}

// Create close reasons bar
function create_reasons_bar() {
    const bar = document.createElement('div');
    bar.className = 'd-flex gs8 s-anchors s-anchors_muted fw-wrap';
    document.querySelector('.js-post-menu>div').insertAdjacentElement('afterend', bar);
    return bar;
}

// Add a fast-action button
function create_fast_action(bar, name, callback) {
    // Create button
    const outer = document.createElement('span');
    outer.appendChild(document.createTextNode('['));

    const ioc = document.createElement('a');
    ioc.classList.add('comments-link');
    ioc.textContent = name;
    // Button event listeners
    ioc.addEventListener('click', callback);

    // Add button
    outer.appendChild(ioc);
    outer.appendChild(document.createTextNode(']'));
    bar.appendChild(outer);
}

async function addComment(bar, comment) {
    if (!can(privs.comment)) return;
    bar.parentNode.querySelector('.js-add-link').click();
    await waitForEl('.js-comment-text-input');
    const input = document.querySelector('.js-comment-text-input');
    input.textContent = comment;
}

// Edit post and focus/scroll to tag bar
async function tag_edit() {
    document.querySelector('.js-edit-post').click();
    await waitForEl('#tageditor-replacing-tagnames--input');
    const tags = document.querySelector('#tageditor-replacing-tagnames--input');
    tags.focus();
    tags.scrollIntoView(); // does not work on longer posts. See issue #1
}

// Close vote or flag as 'Needs debugging details'
async function close_vote(path) {
    if ((!can(privs.flag) && !can(privs.cv)) || !not_closed()) return;
    if (can(privs.flag) && !can(privs.cv)) {
        document.querySelector('.js-flag-post-link').click();
        await waitForEl('.js-flag-load-close');
        document.querySelector('.js-flag-load-close').click();
        await waitForEl('.js-close-question-link');
    }
    document.querySelector('.js-close-question-link').click();

    for (const link of path) {
        await waitForEl(link);
        document.querySelector(link).click();
    }
}
const cv_details = () => close_vote(['#closeReasonId-NeedsDetailsOrClarity']);
const cv_debug = () => close_vote(['#closeReasonId-SiteSpecific', '#siteSpecificCloseReasonId-13-']);
const cv_typo = () => close_vote(['#closeReasonId-SiteSpecific', '#siteSpecificCloseReasonId-11-']);

///
// Fast Actions
///

// Edit tags fast action. Disabled for users with inline tag edit privs.
function tag_edit_fa() {
    if (can(privs.tagEdit)) return;
    const btn = document.createElement('a');
    btn.textContent = 'Edit tags';
    btn.addEventListener('click', tag_edit);

    document.querySelector('.post-taglist>div>.js-post-tag-list-wrapper').appendChild(btn);
}

// Comment/close 'MCVE' fast-action
function mcve_fa(bar) {
    create_fast_action(bar, 'MCVE', async () => {
        await cv_debug();
        await addComment(bar, 'Please edit your question to include a ' +
                         '[minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example)' +
                         ' of the shortest code necessary to replicate the issue.');
    });
}

// Comment/close 'Image of Code' fast-action
function image_of_code_fa(bar) {
    create_fast_action(bar, 'Image of Code', async () => {
        await cv_debug();
        await addComment(bar, '[Please do not upload images of code/data/errors.](//meta.stackoverflow.com/q/285551)');
    });
}

// Comment/retag 'Tag Spam' fast-action
function tag_spam_fa(bar) {
    create_fast_action(bar, 'Tag Spam', async () => {
        tag_edit();
        await addComment(bar, 'Please only add tags that are relevant to your question and avoid tag spamming.');
    });
}

// Close vote reasons as fast-action
function cv_fa(bar) {
    create_fast_action(bar, 'Details / Clarity', cv_details);
    create_fast_action(bar, 'Needs debug', cv_debug);
    create_fast_action(bar, 'No Repo / Typo', cv_typo);
}

// Comment/retag 'Tag Spam' fast-action
function java_is_not_javascript_fa(bar) {
    create_fast_action(bar, 'Java/JS', async () => {
        tag_edit();
        await addComment(bar, '[Java is not JavaScript!](http://javascriptisnotjava.com/)');
    });
}

// NAA/Comment fast-action
function naa_comment(bar) {
    create_fast_action(bar, 'NAA/Comment', async () => {
        bar.closest('.post-layout').querySelector('.js-flag-post-link').click();
        await waitForEl('.s-radio[value="AnswerNotAnAnswer"]');
        document.querySelector('.s-radio[value="AnswerNotAnAnswer"]').click();
        await addComment(bar, 'This does not answer the question and is only asking clarifying ' +
                         'questions. It should have been posted as a comment instead. Once ' +
                         'you gain enough reputation, you will be able to ' +
                         '[comment everywhere](https://stackoverflow.com/help/privileges/comment)' +
                         ' asking for clarifying information.');
    });
}

///
// Main Function
///

(function() {
    'use strict';

    if (can(privs.comment)) {
        const comment_bars = create_comment_bars();
        const question_comments_bar = comment_bars[0];
        image_of_code_fa(question_comments_bar);
        mcve_fa(question_comments_bar);
        tag_spam_fa(question_comments_bar);
        java_is_not_javascript_fa(question_comments_bar);

        for (let i = 1; i < comment_bars.length; i++) {
            naa_comment(comment_bars[i]);
        }
    }

    if ((can(privs.flag) || can(privs.cv)) && not_closed()) {
        const reasons_bar = create_reasons_bar();
        cv_fa(reasons_bar);
    }

    tag_edit_fa();
})();
