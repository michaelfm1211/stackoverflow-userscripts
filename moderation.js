// ==UserScript==
// @name         michaelfm1211's Moderation Fast Actions
// @namespace    https://github.com/michaelfm1211/stackoverflow-userscripts
// @version      1.0
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

// Create bar for the comment actions
function create_comments_bar() {
    const container = document.createElement('span');
    container.style.float = 'right';

    document.querySelector('.comments-link').insertAdjacentElement('afterend', container);
    return container;
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

async function addComment(comment) {
    if (!can(privs.comment)) return;
    document.querySelector('.js-add-link').click();
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
async function cv_debug() {
    if (!can(privs.flag) && !can(privs.cv)) return;
    if (can(privs.flag) && !can(privs.cv)) {
        document.querySelector('.js-flag-post-link').click();
        await waitForEl('.js-flag-load-close');
        document.querySelector('.js-flag-load-close').click();
        await waitForEl('.js-close-question-link');
    }

    document.querySelector('.js-close-question-link').click();
    await waitForEl('#closeReasonId-SiteSpecific');
    document.querySelector('#closeReasonId-SiteSpecific').click();
    await waitForEl('#siteSpecificCloseReasonId-13-');
    document.querySelector('#siteSpecificCloseReasonId-13-').click();
}

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

// Comment/close 'Image of Code' fast-action
function image_of_code_fa(bar) {
    create_fast_action(bar, 'Image of Code', async () => {
        await cv_debug();
        await addComment('[Please do not upload images of code/data/errors.](//meta.stackoverflow.com/q/285551)');
    });
}

// Comment/retag 'Tag Spam' fast-action
function tag_spam_fa(bar) {
    create_fast_action(bar, 'Tag Spam', async () => {
        tag_edit();
        await addComment('Please only add tags that are relevant to your question and avoid tag spamming.');
    });
}

// Comment/retag 'Tag Spam' fast-action
function java_is_not_javascript_fa(bar) {
    create_fast_action(bar, 'Java/JS', async () => {
        tag_edit();
        await addComment('[Java is not JavaScript!](http://javascriptisnotjava.com/)');
    });
}

// Close as 'needs debugging details' fast-action
function cv_debug_fa(bar) {
    if (!can(privs.flag) && !can(privs.cv)) return;
    create_fast_action(bar, 'Needs debug', async () => {
        cv_debug();
    });
}

///
// Main Function
///

(function() {
    'use strict';

    if (can(privs.comment)) {
        const comments_bar = create_comments_bar();
        image_of_code_fa(comments_bar);
        tag_spam_fa(comments_bar);
        java_is_not_javascript_fa(comments_bar);
    }

    if (can(privs.flag) || can(privs.cv)) {
        const reasons_bar = create_reasons_bar();
        cv_debug_fa(reasons_bar);
    }

    tag_edit_fa();
})();
