/**
 * Seniorify version 0.1.0
 * 
 * Get seniority level if any. Then get years of experience if any and check against seniority level.
 * If not accurate, it highlights the experience sentence and correct the actual level.
 */

let inserted = false

const jobDescClass = '#job-details' 
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
            if (!inserted
                && mutation.addedNodes[0] 
                && seniorityLevels.includes(mutation.addedNodes[0].nodeValue)
                && document.contains(document.querySelector(jobDescClass))
            ) {
                inserted = true

                let seniorityLevel = mutation.addedNodes[0].nodeValue
                console.log(seniorityLevel)

                let experience = getExperience(document.querySelector(jobDescClass).innerHTML)

                if (experience !== null) {
                    console.log(experience.years, experience.sentence)
                    let realSeniorityLevel = getSeniorityLevel(experience.years)
                    // replace job details node 
                    // TODO: replace only if tab is at '/jobs/view' url & deal with '/jobs/search'
                    if (window.location.href.includes('/jobs/')) {
                        if (realSeniorityLevel !== seniorityLevel) {
                            if (mutation.addedNodes[0].parentNode.parentNode.classList.contains('jobs-box__group')) {
                                // replace old Seniority level node
                                let sClone = mutation.addedNodes[0].parentNode.cloneNode(true)
                                sClone.classList.add('seniorify')
                                console.log(sClone)
                                // console.log(sClone.children[sClone.children.length - 1])
                                mutation.addedNodes[0].parentNode.parentNode.append(sClone)
                                sClone.innerHTML = `
                                    <span style="text-decoration:line-through">
                                        ${seniorityLevel}
                                    </span> \u00A0${realSeniorityLevel}
                                `
                                mutation.addedNodes[0].parentNode.style = 'display: none !important'
                                // mutation.addedNodes[0].replaceWith(newElement)
                            } else {
                                
                            }

                        }
                    
                        let highlightedSentence = '<span style="background-color:yellow;">' + experience.sentence; + '</span>'
                        console.log(highlightedSentence)
                        // the cloaning is to bypass the rerender problem when ember
                        // tries to rerender by removing child nodes but can't find them since 
                        // we've edited them prior
                        let clone = document.querySelector(jobDescClass).cloneNode(true)
                        document.querySelector(jobDescClass).parentNode.prepend(clone)
                        clone.classList.add('seniorify')
                        clone.innerHTML = clone.innerHTML.replace(
                            experience.sentence,
                            '<span style="background-color:yellow;">' + experience.sentence + '</span>'
                        )
                        document.querySelectorAll(jobDescClass)[1].style = 'display: none !important' 
                    } else {
                        let newElement = document.createElement('div')
                        newElement.setAttribute('id', 'seniorityWarning')
                        newElement.style.color = 'white'
                        newElement.style.padding = '5px 8px'
                        newElement.style.fontSize = '12px'
                    
                        if (realSeniorityLevel !== seniorityLevel) {
                            newElement.style.backgroundColor = '#ff7675'
                            newElement.innerHTML = `
                                Seniority level is not accurate. It's rather ${realSeniorityLevel}.
                            `
                            
                        } else {
                            newElement.style.backgroundColor = '#55efc4'
                            newElement.innerHTML = `
                                Seniority level is accurate.
                            `
                        }
                        document.querySelector('.jobs-search__right-rail').prepend(newElement);
                    }
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

        if (document.contains(document.querySelector('.seniorify'))) {
            // document.querySelector('.seniorify').remove()
            Array.from(document.querySelectorAll('.seniorify')).forEach(elem => elem.remove())
        }
        // maybe replace with a class later
        document.querySelector(jobDescClass).style = 'display: block !important'
        inserted = false
        // For the '/jobs/search/' page
        if (document.contains(document.getElementById('seniorityWarning'))) {
            document.getElementById('seniorityWarning').remove()
        }
        // TODO: Deal with un-mutated nodes containing seniority level

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

            // Split all sentences by HTML tags in case there are any tags within a sentence.
            // Because our future wrapping span tags will stop at the first encoutered tag.
            // (eg. " codeplex or github link;</li><li>1-3+ years experience in a similar development ")
            // In the real life example above, only the -meaningless- first part of the sentence will get highlihted. 
            approxSentence = approxSentence.flatMap(elem => elem.split(/<.+?>/gi))
            
            approxSentence.forEach(sentence => {
                if (['xperience', 'xpérience'].some(elem => sentence.includes(elem))) {
                    allExpSentences.push(sentence)
    
                    // get years number
                    allYearsNumbers.push(Math.max(...sentence.match(/\d{1,2}/g)))
                }
            })
              
        })
    }
    console.log(allExpSentences)
    console.log(allYearsNumbers)
    if (allExpSentences.length > 0) {
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