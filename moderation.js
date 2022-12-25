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

// Create container for the comment actions
function create_comments_container() {
    const addComment = document.querySelector('.comments-link');

    const container = document.createElement('span');
    container.style.float = 'right';

    addComment.insertAdjacentElement('afterend', container);
    return container;
}

///
// Fast Actions
///

// Comment/close 'Image of Code' fast-action
function image_of_code(container) {
    // Create button
    const outer = document.createElement('span');
    outer.appendChild(document.createTextNode('['));

    const ioc = document.createElement('a');
    ioc.classList.add('js-add-link');
    ioc.classList.add('comments-link');
    ioc.textContent = 'Image of Code';

    // Button event listeners
    ioc.addEventListener('click', async () => {
        if (can(privs.cv)) {
            // Close vote for 'Needs debugging details'
            document.querySelector('.js-close-question-link').click();
            await waitForEl('#closeReasonId-SiteSpecific');
            document.querySelector('#closeReasonId-SiteSpecific').click();
            await waitForEl('#siteSpecificCloseReasonId-13-');
            document.querySelector('#siteSpecificCloseReasonId-13-').click();
        }

        if (can(privs.comment)) {
            // Open comments
            await waitForEl('.js-comment-text-input');
            const input = document.querySelector('.js-comment-text-input');
            input.textContent = '[Please do not upload images of code/data/errors.](//meta.stackoverflow.com/q/285551)';
        }
    });

    // Add button
    outer.appendChild(ioc);
    outer.appendChild(document.createTextNode(']'));
    container.appendChild(outer);
}

// Edit tags fast action. Disabled for users with inline tag edit privs.
function tag_edit() {
    if (can(privs.tagEdit)) return;
    const btn = document.createElement('a');
    btn.textContent = 'Edit tags';
    btn.addEventListener('click', async () => {
        document.querySelector('.js-edit-post').click();
        await waitForEl('#tageditor-replacing-tagnames--input');
        const tags = document.querySelector('#tageditor-replacing-tagnames--input');
        tags.focus();
        tags.scrollIntoView(); // does not work on longer posts. See issue #1
    });

    document.querySelector('.post-taglist>div>.js-post-tag-list-wrapper').appendChild(btn);
}

///
// Main Function
///

(function() {
    'use strict';

    const comments_container = create_comments_container();
    image_of_code(comments_container);

    tag_edit();
})();
