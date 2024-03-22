'use strict';

// https://creativecommons.org/publicdomain/zero/1.0/

/**
 * Transfer employee data from peoplesoft oracle database view 
 * to an accela record via the Accela V4 Rest API
 * 
 * @module AccelaAPI
 * @version v1
 * 
 **/


Error.stackTraceLimit = 100;

var oracledb = require('oracledb');
var log4js = require('log4js');
var dbConfig = require('./config/DBConfig.js');
var accelaConfig = require("./config/accelaConfig.json");
log4js.configure("./config/log4js.json");

var mainLogger;
var myCurrentDate1;
var myCurrentDate2;
var myCurrentTimeShort;
var myISODateTimeString;
var myTokenValue;

/**
 * 
 * Get a bearer token for further interactions with the Accela api during this script execution
 * 
 * Sets the global myTokenValue
 * 
 **/

async function getOAuthToken() {

    //alert("get_token");

    //alert( "JSON Data: " + myJSON['xapp']);

    var myHeaders = new Headers();
    myHeaders.append("content-type", "application/x-www-form-urlencoded");
    myHeaders.append("x-accela-appid", accelaConfig.client_id);

    var urlencoded = new URLSearchParams();
    urlencoded.append("client_id", accelaConfig.client_id);
    urlencoded.append("client_secret", accelaConfig.client_secret);
    urlencoded.append("grant_type", accelaConfig.grant_type);
    urlencoded.append("username", accelaConfig.username);
    urlencoded.append("password", accelaConfig.password);
    urlencoded.append("scope", accelaConfig.scope);
    urlencoded.append("agency_name", accelaConfig.agency_name);
    urlencoded.append("environment", accelaConfig.environment);

    //alert("token params created");

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: urlencoded,
        redirect: 'follow'
    };

    var tokenJson;
    var tokenResult;
    var tokenError;
    const response = await fetch("https://apis.accela.com/oauth2/token", requestOptions)
        .then((response) => tokenJson = response.json())
        .then((result) => tokenResult = result) //mainLogger.info(employeeBadgeInfo.emplid + ":" + result)
        .catch((error) => tokenError = error); //console.error(employeeBadgeInfo.emplid + ":" + error)

    var returnJson = await tokenJson;
    myTokenValue = returnJson.access_token;
    return returnJson;
}
/**
 * 
 * Return true if a variable is either undefined,null or an empty string
 * 
 * @param {object} isNullVariable
 *      A variable from either an oracle or accela result set
 * @return {bool} 
 * 
 **/
function isEmpty(isNullVariable) {
    return (isNullVariable === undefined) || isNullVariable === null || isNullVariable === '' || (/^\s*$/).test(isNullVariable);
}


/**
 * 
 * Get a result set from Accela API for Employee Badge Info records
 * 
 * @param {number} offset
 *      The offset position of the first record in the results response array.
 * @return {JSON} 
 * 
 **/
async function getEmployeeBadgeInfoList(offset) {

    /*
    // var params = ['AMS-Miscellaneous-Badge.cInfo-NA'];
    //var escapedID =  encodeURIComponent('AMS.1Miscellaneous.1Badge.0cInfo.1NA')
    //var EMP_REQUEST_API_URL = "https://apis.accela.com/v4/records?type=" + escapedID ;
    var EMP_REQUEST_API_URL = "https://apis.accela.com/v4/records?module=AMS";
    if (offset > 0) {
    EMP_REQUEST_API_URL = EMP_REQUEST_API_URL + "?offset=" + offset;
    }
    
    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");
    var requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
    };
    const response = await fetch(EMP_REQUEST_API_URL, requestOptions);
    
    */
    var accelaBadgeEmployees = [];

    var EMP_SEARCH_API_URL = "https://apis.accela.com/v4/search/records?expand=customForms&limit=1000";
    if (offset > 0) {
        EMP_SEARCH_API_URL = EMP_SEARCH_API_URL + "&offset=" + offset;
    }

    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    var raw = '{"type":{"alias": "Employee Badge Info"}}';
    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    var searchJson;
    var searchResult;
    var searchError;
    const response = await fetch(EMP_SEARCH_API_URL, requestOptions)
        .then((response) => searchJson = response.json())
        .then((result) => searchResult = result) //mainLogger.info(employeeBadgeInfo.emplid + ":" + result)
        .catch((error) => searchError = error); //console.error(employeeBadgeInfo.emplid + ":" + error)

    var returnJson = await searchJson;
    return returnJson;
}

/**
 * 
 * Add an employee record from peoplesoft to accela as 'Employee Badge Info' type
 * 
 * @param {object} employeeBadgeInfo
 *      contains peoplesoft data record
 * @return {string} 
 *      http response text
 * 
 **/
async function loadEmployee(employeeBadgeInfo) {

    var LOAD_EMP_API_URL = "https://apis.accela.com/v4/records";

    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "createdBy": "ADMIN",
        "customForms": [
            {
                "id": "EMP_BADGE_IN-EMP_INFO",
                "EMPLID": employeeBadgeInfo.emplid,
                "JOBCODE": employeeBadgeInfo.jobcode,
                "EMPL_STATUS": employeeBadgeInfo.empl_status,
                "DEPTID": employeeBadgeInfo.deptid,
                "DEPTID_DESC": employeeBadgeInfo.deptid_desc,
                "HOURLY_RT": employeeBadgeInfo.hourly_rt,
                "EMPL_NAME": employeeBadgeInfo.name,
                "JOBCODE_DESC": employeeBadgeInfo.jobcode_desc,
                "TIME_CLOCK_BADGE_NBR": employeeBadgeInfo.time_clock_badge_nbr,
                "LAST_UPDATED_DATE": myCurrentDate1,
                "LAST_UPDATED_TIME": myCurrentTimeShort
            }
        ],
        "description": employeeBadgeInfo.time_clock_badge_nbr,
        "initiatedProduct": "AV360",
        "name": "Emp Info",
        "openedDate": myISODateTimeString,
        "shortNotes": "Info for " + employeeBadgeInfo.emplid,
        "status": {
            "text": "Completed",
            "value": "Completed"
        },
        "type": {
            "alias": "Employee Badge Info",
            "category": "NA",
            "group": "AMS",
            "module": "AMS",
            "subType": "Badge Info",
            "type": "Miscellaneous"
        },
        "updateDate": myISODateTimeString
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    var loadText;
    var loadResult;
    var loadError;
    const response = await fetch(LOAD_EMP_API_URL, requestOptions)
        .then((response) => loadText = response.text())
        .then((result) => loadResult = result) //mainLogger.info(employeeBadgeInfo.emplid + ":" + result)
        .catch((error) => loadError = error); //console.error(employeeBadgeInfo.emplid + ":" + error)

    var returnText = await loadText;
    return returnText;
}

/**
 * 
 * Update the accela record from peoplesoft database
 * 
 * @param {object} peopleSoftEmployee
 *      contains peoplesoft data record
 * @param {object} accelaEmployee
 *      contains accela data record
 * @return {string} 
 *      http response text
 * 
 **/
async function updateEmployee(peopleSoftEmployee, accelaEmployee) {

    var UPDATE_EMP_API_URL = "https://apis.accela.com/v4/records/" + accelaEmployee.id + "/customForms";

    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    var rawBadgeInfoArray = [];
    rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "LAST_UPDATED_DATE": myCurrentDate1 });
    rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "LAST_UPDATED_TIME": myCurrentTimeShort });

    if (accelaEmployee.customForms[0].DEPTID !== peopleSoftEmployee.deptid) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "DEPTID": peopleSoftEmployee.deptid });
    }

    if (accelaEmployee.customForms[0].DEPTID_DESC !== peopleSoftEmployee.deptid_desc) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "DEPTID_DESC": peopleSoftEmployee.deptid_desc });
    }

    if (accelaEmployee.customForms[0].EMPL_NAME !== peopleSoftEmployee.name) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "EMPL_NAME": peopleSoftEmployee.name });
    }

    if (accelaEmployee.customForms[0].EMPL_STATUS !== peopleSoftEmployee.empl_status) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "EMPL_STATUS": peopleSoftEmployee.empl_status });
    }

    if (Math.round(accelaEmployee.customForms[0].HOURLY_RT * 1000000) !== Math.round(peopleSoftEmployee.hourly_rt * 1000000)) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "HOURLY_RT": peopleSoftEmployee.hourly_rt });
    }

    if (accelaEmployee.customForms[0].JOBCODE !== peopleSoftEmployee.jobcode) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "JOBCODE": peopleSoftEmployee.jobcode });
        
    }

    if (accelaEmployee.customForms[0].JOBCODE_DESC !== peopleSoftEmployee.jobcode_desc) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "JOBCODE_DESC": peopleSoftEmployee.jobcode_desc });
    }

    if ( !(isEmpty(accelaEmployee.customForms[0].TIME_CLOCK_BADGE_NBR) && isEmpty(peopleSoftEmployee.time_clock_badge_nbr))
        &&
        (accelaEmployee.customForms[0].TIME_CLOCK_BADGE_NBR !== peopleSoftEmployee.time_clock_badge_nbr)) {

        rawBadgeInfoArray.push({ "id": "EMP_BADGE_IN-EMP_INFO", "TIME_CLOCK_BADGE_NBR": peopleSoftEmployee.time_clock_badge_nbr });
    }

    var raw = JSON.stringify(rawBadgeInfoArray);

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };


    var updateText;
    var updateResult;
    var updateError;
    const response = await fetch(UPDATE_EMP_API_URL, requestOptions)
        .then((response) => updateText = response.text())
        .then((result) => updateResult = result) //mainLogger.info(accelaEmployee.id + ":" + result)
        .catch((error) => updateError = error); //console.error(accelaEmployee.id + ":" + error)

    var returnText = await updateText;
    return returnText;

}

/**
 * 
 * Update the accela record to have an employee status of 'I'
 * 
 * @param {text} thisRecordId
 *      the identifier of the employee record
 * @return {string} 
 *      http response text
 * 
 **/
async function naEmployee(thisRecordId) {

    var UPDATE_EMP_API_URL = "https://apis.accela.com/v4/records/" + thisRecordId + "/customForms";

    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify([
        { "id": "EMP_BADGE_IN-EMP_INFO", "EMPL_NAME": "joe" }
    ]);

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    var deactivateText;
    var deactivateResult;
    var deactivateError;
    const deactivateResponse = await fetch(UPDATE_EMP_API_URL, requestOptions)
        .then((response) => deactivateText = response.text())
        .then((result) => deactivateResult = result) // mainLogger.info(thisRecordId + ":" + result)
        .catch((error) => deactivateError = error); // console.error(thisRecordId + ":" + error)

    var returnText = await deactivateText;
    return returnText;

}

async function deactivateEmployee(thisRecordId) {

    var UPDATE_EMP_API_URL = "https://apis.accela.com/v4/records/" + thisRecordId + "/customForms";
 
    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify([
        { "id": "EMP_BADGE_IN-EMP_INFO", "EMPL_STATUS": "I" }
    ]);

    const requestOptions = {
        method: "PUT",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    var deactivateText;
    var deactivateResult;
    var deactivateError;
    const deactivateResponse = await fetch(UPDATE_EMP_API_URL, requestOptions)
        .then((response) => deactivateText = response.text())
        .then((result) => deactivateResult = result ) // mainLogger.info(thisRecordId + ":" + result)
        .catch((error) => deactivateError = error); // console.error(thisRecordId + ":" + error)

    var returnText = await deactivateText;
    return returnText;

}
/**
 * 
 * Delete an accela record 
 * 
 * @param {text} thisRecordId
 *      the identifier of the employee record
 * @return {string} 
 *      http response text
 * 
 **/
async function deleteEmployee(thisRecordId) {

    var DELETE_EMP_API_URL = "https://apis.accela.com/v4/records/" + thisRecordId;

    var myHeaders = new Headers();
    myHeaders.append("Authorization", myTokenValue);
    myHeaders.append("Content-Type", "application/json");

    const requestOptions = {
        method: "DELETE",
        headers: myHeaders,
        redirect: "follow"
    };

    var deleteText;
    var deleteResult;
    var deleteError;
    const response = await fetch(DELETE_EMP_API_URL, requestOptions)
        .then((response) => deleteText = response.text())
        .then((result) => deleteResult = result) // mainLogger.info(thisRecordId + ":" + result))
        .catch((error) => deleteError = error); // console.error(thisRecordId + ":" + error)

    var returnText = await deleteText;
    return returnText;

}
/**
 * 
 * Sets global time/date variables
 * 
 **/
function setCurrentDates() {
    var todayDate = new Date();
    myISODateTimeString = todayDate.toISOString();
    var dd = String(todayDate.getDate()).padStart(2, '0');
    var mm = String(todayDate.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = todayDate.getFullYear();

    // why do we have dates formatted differently?
    myCurrentDate1 = mm + '/' + dd + '/' + yyyy;
    myCurrentDate1 = myCurrentDate1.toString();
    myCurrentDate2 = yyyy + '-' + mm + '-' + dd;
    myCurrentDate2 = myCurrentDate2.toString();

    var curHour = todayDate.getHours();
    var curMinute = todayDate.getMinutes() < 10 ? "0" + todayDate.getMinutes() : todayDate.getMinutes();
    var curSeconds = todayDate.getSeconds() < 10 ? "0" + todayDate.getSeconds() : todayDate.getSeconds();

    if (curHour < 10) {
        curHour = "0" + curHour;
    }
    if (curMinute < 10) {
        curMinute = "0" + curMinute;
    }
    if (curSeconds < 10) {
        curSeconds = "0" + curSeconds;
    }

    //myCurrentTime = curHour + ":" + curMinute + " " + curMeridiem;
    //formatted to Accela standard
    //yyyy-MM-dd'T'HH:mm:ss.SSSZ
    //"2024-02-20T16:43:28Z"
    //mainLogger.info(myCurrentTime);
    myCurrentTimeShort = curHour + ":" + curMinute;
}

/**
 * main execution of the application
 * 
 * Get all records from peoplesoft and accela, 
 * compare the records, 
 * update those that have changed, 
 * add those that are new to accela,  
 * and inactivate those in accela but no longer in peoplesoft
 * 
 **/
async function run() {

    mainLogger = log4js.getLogger();
    mainLogger.info("run");
    var totalUpdate = 0;
    var totalLoad = 0;
    var totalInactive = 0;

    let connection;

    var peoplesoftEmployeeList = [];
    var accelaEmployeeList = [];
    try {



        // Get a non-pooled connection
        connection = await oracledb.getConnection(dbConfig);

        /*
                dynamic rs = DB.Query(@"select  emplid, jobcode, empl_status, deptid, hourly_rt, name, deptid_desc, jobcode_desc, time_clock_badge_nbr from SYSADM.ACCELA_PERSONNEL_DATA_VW@PSOFT");
        */
        // query the people soft view for badge information
        const result = await connection.execute(
            `select  emplid, jobcode, empl_status, deptid, hourly_rt, name, deptid_desc, jobcode_desc, time_clock_badge_nbr from SYSADM.ACCELA_PERSONNEL_DATA_VW`,
            [], // no bind variables
            {
                resultSet: true // return a ResultSet (default is false)
            });

        const numRows = 100;

        // Fetch rows from the Peoplesoft database ResultSet.
        // push all the results onto the peoplesoftEmployeeList
        const rs = result.resultSet;
        let rows;
        let totalRows = 0;
        do {
            rows = await rs.getRows(numRows); // get numRows rows at a time
            for (var i = 0; i < rows.length; ++i) {
                var employeeBadgeInfo = {
                    emplid: rows[i][0],
                    jobcode: rows[i][1],
                    empl_status: rows[i][2],
                    deptid: rows[i][3],
                    hourly_rt: rows[i][4],
                    name: rows[i][5],
                    deptid_desc: rows[i][6],
                    jobcode_desc: rows[i][7],
                    time_clock_badge_nbr: rows[i][8]
                };
                peoplesoftEmployeeList.push(employeeBadgeInfo);
  
            }
            if (rows.length > 0) {
                totalRows += rows.length;
            }
        } while (rows.length === numRows);
        mainLogger.info("found a total of " + totalRows + " employees in peoplesoft");
        // always close the ResultSet
        await rs.close();

        // get the accela api authentication token

        var myJSONToken = await getOAuthToken();
        // Fetch rows from Accela .
        // push all the results onto the accelaEmployeeList
        var offset = 0;
        do {
            var listResult = await getEmployeeBadgeInfoList(offset);
            offset += 1000;
            if (listResult != undefined) {
                accelaEmployeeList = accelaEmployeeList.concat(listResult.result);
            }
        } while (listResult != undefined && listResult.page.hasmore);

        mainLogger.info("found a total of " + accelaEmployeeList.length + " employees in accela");
        // I am using PsoftFound to indicate which employees pulled from
        // accela have not been found in Psoft and should be marked as inactive
        accelaEmployeeList.forEach((accelaEmployee) => accelaEmployee.PsoftFound = false);
        // Go through every entry in the peoplesoft list and either create or update the entries in Accela
        var lastEmployeeID = 0;
        peoplesoftEmployeeList.forEach((peopleSoftEmployee) => {
            var employeeID = peopleSoftEmployee.emplid;
            var isPsoftEmployeeInAccela = false;
            accelaEmployeeList.forEach((accelaEmployee) => {
                if (!(accelaEmployee.customForms === null || accelaEmployee.customForms === undefined)) {
                    var accelaEmployeeId = accelaEmployee.customForms[0].EMPLID;
                    if (accelaEmployeeId === employeeID) {
                        // found that accela has the employee as found in peoplesoft
                        // determine if anything has changed, if so call update otherwise leave alone

                        if (!
                            (accelaEmployee.customForms[0].DEPTID === peopleSoftEmployee.deptid &&
                                accelaEmployee.customForms[0].DEPTID_DESC === peopleSoftEmployee.deptid_desc &&
                                accelaEmployee.customForms[0].EMPL_NAME === peopleSoftEmployee.name &&
                                accelaEmployee.customForms[0].EMPL_STATUS === peopleSoftEmployee.empl_status &&
                                Math.round(accelaEmployee.customForms[0].HOURLY_RT * 1000000) === Math.round(peopleSoftEmployee.hourly_rt * 1000000) &&
                                accelaEmployee.customForms[0].JOBCODE === peopleSoftEmployee.jobcode &&
                                accelaEmployee.customForms[0].JOBCODE_DESC === peopleSoftEmployee.jobcode_desc &&
                                ((isEmpty(accelaEmployee.customForms[0].TIME_CLOCK_BADGE_NBR) && isEmpty(peopleSoftEmployee.time_clock_badge_nbr)) ||
                                    accelaEmployee.customForms[0].TIME_CLOCK_BADGE_NBR === peopleSoftEmployee.time_clock_badge_nbr)
                            )
                        ) {
                            updateEmployee(peopleSoftEmployee, accelaEmployee);
                            mainLogger.info(accelaEmployee.id + ": Updated employee: " + peopleSoftEmployee.emplid);
                            ++totalUpdate;
                        }
                        /*
                        else {
                            // delete mistake duplicates in test
                          //  if (lastEmployeeID === peopleSoftEmployee.emplid) {
                                deleteEmployee(accelaEmployee.id);
                                mainLogger.info(peopleSoftEmployee.emplid + " DELETED.");
                         //   } else {
                         //       lastEmployeeID = peopleSoftEmployee.emplid;

                         //   }
                        }
                        */

                        // if the employee is found in Accela then do not create!
                        isPsoftEmployeeInAccela = true;
                        // I am using PsoftFound to indicate which employees pulled from
                        // accela have not been found in Psoft and should be marked as inactive
                        accelaEmployee.PsoftFound = true;
                    }
                }
            });
            if (!isPsoftEmployeeInAccela) {
                // create
                
                loadEmployee(peopleSoftEmployee);
                mainLogger.info(peopleSoftEmployee.emplid + ":Loaded employee");
                ++totalLoad;
            }
        });

        // Go through every entry in the accela list and inactivate any not found on the peoplesoft list
        accelaEmployeeList.forEach((accelaEmployee) => {
            if (!accelaEmployee.PsoftFound && accelaEmployee.customForms[0].EMPL_STATUS === 'A') {
                // update employee in accela to be inactive (?)

                deactivateEmployee(accelaEmployee.id);
                mainLogger.info(accelaEmployee.id + ": Deactivated employee");
                ++totalInactive;
            }
        });
    } catch (err) {
        console.error(err);

    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
    mainLogger.info("Total number updated: " + totalUpdate);
    mainLogger.info("Total number loaded: " + totalLoad);
    mainLogger.info("Total number inactivated: " + totalInactive);
    log4js.shutdown();
}

try {
    run();
} catch (error) {
    console.error(error);
}
