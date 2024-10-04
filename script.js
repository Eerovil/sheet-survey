

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

let webhook = urlParams.get('webhook');

if (!webhook) {
    webhook = prompt("Enter your webhook URL");
    // Add the webhook to the URL (first encode it)
    window.location.href = window.location.href + "?webhook=" + encodeURIComponent(webhook);
}


window.DATA = [];
window.SENTDATA = 0;
window.TIMEOUT = {};


const setSentData = function(newSentData) {
    window.SENTDATA = newSentData;
    const sentDataEl = document.getElementById("sent-data");
    if (!sentDataEl) {
        console.error("Could not find sent data element");
    }
    sentDataEl.innerHTML = `${newSentData}/${window.DATA.length}`;
}



const updateDataSending = function(newStatus) {
    const dataSendingStatusEl = document.getElementById("data-send-status");
    if (!dataSendingStatusEl) {
        console.error("Could not find data sending status element");
    }
    if (newStatus == "sending") {
        dataSendingStatusEl.innerHTML = "Sending data...";
    }
    else if (newStatus == "idle") {
        dataSendingStatusEl.innerHTML = "Idle";
    }
    else {
        console.error("Invalid data sending status");
        dataSendingStatusEl.innerHTML = "Error";
    }
}
        


const sendData = async function(data) {
    const webhookURL = new URL(webhook);
    for (const [key, value] of Object.entries(data)) {
        webhookURL.searchParams.append(key, value);
    }
    return fetch(webhookURL, {
        mode: 'no-cors',
        method: 'GET',
    });
};

const getNextDataToSend = function() {
    for (let i = 0; i < window.DATA.length; i++) {
        if (!window.DATA[i].sent) {
            return window.DATA[i];
        }
    }
    return null;
}

let sendDataTimeout;

const tryToSendData = async function() {
    const data = getNextDataToSend();
    if (data) {
        updateDataSending("sending");
        try {
            await sendData(data);
            updateDataSending("idle");
            setSentData(window.SENTDATA + 1);
            data.sent = true;
            sendDataTimeout = setTimeout(tryToSendData, 10);
        } catch (error) {
            console.error("Error sending data", error);
            updateDataSending("error");
            sendDataTimeout = setTimeout(tryToSendData, 1000);
        }
    } else {
        updateDataSending("idle");
        sendDataTimeout = setTimeout(tryToSendData, 1000);
    }
}


sendDataTimeout = setTimeout(tryToSendData, 1000);

const MAXTIMEOUT = 1000;

const addTimeout = function(question, answer) {
    // Find the .answers element with data-question attribute equal to question
    window.TIMEOUT[question] = MAXTIMEOUT;
    const interval = setInterval(() => {
        window.TIMEOUT[question] -= 100;
        if (question == 'mitäpidit') {
            if (answer == '1') {
                // Show red tint aroudn the screen
                document.body.style.backgroundColor = `rgba(255, 0, 0, ${(window.TIMEOUT[question] / MAXTIMEOUT) * 0.1})`;
            }
            if (answer == '2') {
                // Show red-orange tint around the screen
                document.body.style.backgroundColor = `rgba(255, 69, 0, ${(window.TIMEOUT[question] / MAXTIMEOUT) * 0.1})`;
            }
            if (answer == '3') {
                // Show orange tint around the screen
                document.body.style.backgroundColor = `rgba(255, 165, 0, ${(window.TIMEOUT[question] / MAXTIMEOUT) * 0.1})`;
            }
            if (answer == '4') {
                // Show yellow tint around the screen
                document.body.style.backgroundColor = `rgba(255, 255, 0, ${(window.TIMEOUT[question] / MAXTIMEOUT) * 0.1})`;
            }
            if (answer == '5') {
                // Show green tint around the screen
                document.body.style.backgroundColor = `rgba(0, 255, 0, ${(window.TIMEOUT[question] / MAXTIMEOUT) * 0.1})`;
            } 
        }
        if (window.TIMEOUT[question] <= 0) {
            clearInterval(interval);
            delete window.TIMEOUT[question];
        }
    }, 100);
}


const answerQuestion = function(event, element, answer) {
    const question = element.parentElement.getAttribute("data-question");
    if (window.TIMEOUT[question]) {
        return;
    }
    addTimeout(question, answer);
    element.classList.add("clicked");
    setTimeout(() => {
        element.classList.remove("clicked");
    }, MAXTIMEOUT);
    // 20 char random string
    const uuid = Math.random().toString(36).substring(2, 22);
    window.DATA.push({
        "time": (new Date()).toISOString(),
        "uuid": uuid,
        "question": question,
        "answer": answer,
    });
    setSentData(window.SENTDATA);
};


const downloadData = function() {
    const fullSheet = [];
    const header = Object.keys(window.DATA).map(header => ({value: header, type: 'string'}));
    fullSheet.push(header);
    for (const data of window.DATA) {
        const row = Object.values(data).map(value => ({value: value, type: 'string'}));
        fullSheet.push(row);
    }
    const filename = 'survey';
    zipcelx({
      filename: filename,
      sheet: {
        data: fullSheet
      }
    });
}

document.getElementById("download-data").onclick = downloadData;
