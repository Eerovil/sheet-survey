

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

let webhook = urlParams.get('webhook');

if (webhook == 'null' || webhook == 'undefined' || webhook == null) {
    webhook = null;
}

if (!webhook) {
    // check local storage as well
    webhook = window.localStorage.getItem("webhook");
    if (webhook == 'null' || webhook == 'undefined' || webhook == null) {
        webhook = null;
    }
}
if (!webhook) {
    webhook = prompt("Enter your webhook URL");
    // Add the webhook to the URL (first encode it)
    window.localStorage.setItem("webhook", webhook);
    window.location.href = window.location.href + "?webhook=" + encodeURIComponent(webhook);
}

const getAllData = function() {
    return JSON.parse(window.localStorage.getItem("survey-lines") || "[]");
}
const allDataSet = function(data) {
    window.localStorage.setItem("survey-lines", JSON.stringify(data));
}
const allDataPush = function(data) {
    const allData = getAllData();
    allData.push(data);
    allDataSet(allData);
}
const allDataUpdate = function(uuid, newData) {
    const allData = getAllData();
    for (let i = 0; i < allData.length; i++) {
        if (allData[i].uuid == uuid) {
            allData[i] = {...allData[i], ...newData};
            break;
        }
    }
    allDataSet(allData);
}


window.TIMEOUT = {};


const updateSentData = function() {
    const sentDataEl = document.getElementById("sent-data");
    if (!sentDataEl) {
        console.error("Could not find sent data element");
    }
    const allData = getAllData();
    sentDataEl.innerHTML = `${allData.filter(d => d.sent).length}/${allData.length}`;
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
    const allData = getAllData();
    for (let i = 0; i < allData.length; i++) {
        if (!allData[i].sent) {
            return allData[i];
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
            updateSentData();
            allDataUpdate(data.uuid, {sent: true});
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


sendDataTimeout = setTimeout(tryToSendData, 10);
updateSentData();

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


const basicDateTime = function() {
    // Return like this formatted 31.12.2021 klo 23.59.59
    // Remember to add leading zeros
    let date = new Date();
    const lpad = (s) => s.toString().padStart(2, '0');
    return `${date.getDate()}.${lpad(date.getMonth() + 1)}.${date.getFullYear()} klo ${lpad(date.getHours())}.${lpad(date.getMinutes())}.${lpad(date.getSeconds())}`;
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
    allDataPush({
        "time": basicDateTime(),
        "uuid": uuid,
        "question": question,
        "answer": answer,
    });
    updateSentData();
};


const downloadData = function() {
    const allData = getAllData();
    const fullSheet = [];
    const header = Object.keys(allData).map(header => ({value: header, type: 'string'}));
    fullSheet.push(header);
    for (const data of allData) {
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
