/**
 * Seniorify version 0.1.0
 * 
 * Get seniority level if any. Then get years of experience if any and check against seniority level.
 * If not accurate, it highlights the experience sentence and correct the actual level.
 */

let inserted = false

const jobDescClass = '#job-details span' 
const jobMetaClass = '.jobs-description__details'
const seniorityLevels = ['Entry level', 'Associate', 'Mid-Senior level']

console.log("Seniorify is running...")    


// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: true, subtree: true }

// Callback function to execute when mutations are observed
const callback = function(mutationsList) {
    // Use traditional 'for loops' for IE 11
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            if (!inserted && mutation.addedNodes[0] && seniorityLevels.includes(mutation.addedNodes[0].nodeValue)) {
                inserted = true

                let seniorityLevel = mutation.addedNodes[0].nodeValue
                console.log(seniorityLevel)

                let experience = getExperience(document.querySelector(jobDescClass).innerHTML)

                if (experience !== null) {
                    console.log(experience.years, experience.sentence)
                    let realSeniorityLevel = getSeniorityLevel(experience.years)
                    if (realSeniorityLevel !== seniorityLevel) {
                        // replace old Seniority level node
                        let newElement = document.createElement('div')
                        newElement.innerHTML = `
                            <span style="text-decoration:line-through">
                                ${seniorityLevel}
                            </span> \u00A0${realSeniorityLevel}
                        `
                        mutation.addedNodes[0].replaceWith(newElement)

                    }
                    // replace job details node 
                    // TODO: replace only if tab is at '/jobs/view' url & deal with '/jobs/search'
                    let highlightedSentence = '<span style="background-color:yellow;">' + experience.sentence; + '</span>'
                    console.log(highlightedSentence)
                    document.querySelector(jobDescClass).innerHTML = 
                    document.querySelector(jobDescClass).innerHTML.replace(
                        experience.sentence,
                        '<span style="background-color:yellow;">' + experience.sentence + '</span>'
                    )
                }
            }
        }
    }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(document, config);

// Listener used to get URL changes to rerun operation
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      // listen for messages sent from background.js
    if (request.message === 'url changed!') {
        console.log(`New URL: ${request.url}`)
        inserted = false
    }
});

/**
 * Tries to find sentences which have a years indication within
 * by matching most possible forms it can take (eg. 5 years, 2+ years..)
 * Then using regex again to see if there's any mention of 'experience' nearby.
 * 
 * @param {string} jobDetailsHTML - The HTML of the job description
 * @return {Object} Sentence, and number of years pair or null
 */
function getExperience(jobDetailsHTML) {
    // match anything like X[X[+]] years
    let allYearsOccurences = jobDetailsHTML.match(/\d{1,2}\+?\s?(ans|an|ann(é|e)es|ann(é|e)e|years|year)/gmi)
    console.log(allYearsOccurences)

    let allExpSentences = []
    let allYearsNumbers = []
    // get those that have 'experience' nearby, which is -/+ 7 words or avg -/+ 40 characters
    if (allYearsOccurences !== null) {
        allYearsOccurences.forEach(occurence => {
            // first patch special char + (eg. 2+ years) to make regex string
            occurence = occurence.replace('+', '\\+')

            let reString = '(\\s|&nbsp;).{0,40}' + occurence + '.{0,40}(\\s|&nbsp;)'
            console.log(reString)
            let re = new RegExp(reString, 'gmis')
            let approxSentence = jobDetailsHTML.match(re)
            console.log(approxSentence)
            approxSentence.forEach(sentence => {
                if (['xperience', 'xpérience'].some(elem => sentence.includes(elem))) {
                    allExpSentences.push(sentence)
    
                    // get years number
                    allYearsNumbers.push(sentence.match(/\d{1,2}/g)[0])
                }
            })
              
        })
    }
    console.log(allExpSentences)
    console.log(allYearsNumbers)
    if (allExpSentences.length > 1) {
        return {
            sentence: allExpSentences[allExpSentences.length - 1],
            years: Math.max(...allYearsNumbers)
        }
    }
    else return null
}

/** 
 * Returns seniority level for given number of years.
 * 
 * Entry Level: 0 Years Experience
 * Associate: 2 Years Experience
 * Mid-Senior level: 5 Years Experience
 * 
 * Source of the classification: {@link https://qr.ae/pNLaFA}
 */
function getSeniorityLevel(years) {
    if (years < 2) return 'Entry level'
    return (years < 5) ? 'Associate' : 'Mid-Senior level'
}