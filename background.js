chrome.tabs.onUpdated.addListener( function(tabId, changeInfo, tab) {
        // read changeInfo data and do something with it
        // like send the new url to content scripts
        if (changeInfo.url) {
            chrome.tabs.sendMessage( tabId, {
                message: 'url changed!',
                url: changeInfo.url
            })
        }
    }
);