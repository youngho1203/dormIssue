/**
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const ws = SpreadsheetApp.getActiveSpreadsheet();
const listsSheet = ws.getSheetByName("Response List");
const configSheet = ws.getSheetByName("Config");
const History_Tab = "History";
const title_array = ['등록 시간','호실','학번','고장 유형','상세 설명','사진 링크','이메일'];

/**
 * For RoomCardId, StudentId double check
 * 현황 Sheet URL
 * Security 문제 때문에  
 */ 
const STATUS_SHEET_REQUEST_URL= 'https://docs.google.com/spreadsheets/d/1SP7fhSOQ0P8M6bs564_pOWgEGVkpGfRuh2veioCNyuU/gviz/tq?gid=774021608';
//
const REQUEST_RANGE = 'B3:E178';
//
const REQUEST_QUERY_COMMAND = 'Select B,C,D,E WHERE E > 0 AND D=FALSE';

function setInitialValue(e) {
  if(!e){
    return;
  }
  //
  // 새로운 행(새로운 민원)이 입력되었을 때 Call
  //
    let range_modified = e.range;
    if(range_modified.getSheet().getSheetName() !== 'Response List') return;
    if(range_modified.getRow() < 2) return;
    // console.log(range_modified);
    // for example : 1423A ( 호실 (2번째 열) 의 값으로 구분 (8번쨰 열)의 값을 설정함.
    var value = listsSheet.getRange(range_modified.getRow(), 2).getValue().toString().substring(0,4);
    var divisionRange = configSheet.getRange("E2:E85");
    divisionRange.getValues().forEach((roomNumber, index) => {
      if(roomNumber == value) {
        cellValue = configSheet.getRange("E" + (2 + index)).offset(0,1).getValue();
        // according to room number, 8번째 column (구분) 의 값을 설정
        listsSheet.getRange(range_modified.getRow(), 8).setValue(cellValue);        
      }
    });

    // according to malfunction type 고장 유형(4번쨰 열)의 값을 가지고 유형 (9번쨰 열)의 값을 설정함
    value = listsSheet.getRange(range_modified.getRow(), 4).getValue()
    divisionRange = configSheet.getRange("G2:G29");
    divisionRange.getValues().forEach((type, index) => {
      if(type == value) {
        cellValue = configSheet.getRange("G" + (2 + index)).offset(0,1).getValue();
        // according to malfunction type, 9번째 column (유형) 의 값을 설정 ; // 전기, 기계, 영선, 자체
        var color = getColor(cellValue);
        listsSheet.getRange(range_modified.getRow(), 9).setValue(cellValue).setFontColor(color);        
      }
    });

    // always, 10번째 column (상태) 의 값은 초기값은 항상 Open
    let range = listsSheet.getRange(range_modified.getRow(), 10);
    range.setValue('Open');

    // roomNumber, studentId 확인
    let values = range_modified.getValues()[0];
    if(!userCheck(values[2], values[1])) {
      range_modified.offset(0, 0, 1, 6).setBackground("Orange");
    } 

    // notify
    try {
      notify(range);
    }
    catch(e) {
      console.log(e);
    }
  }   

/**
 * current list sheet 에서 studentId, roomNumber 가 일치하는지 재 확인한다.
 */
function userCheck(studentId, roomCardId) {
  let roomNumber = roomCardId.substring(0,4);
  let bedCode = roomCardId.substring(4,5);
  let check = false;
  let result = query();
  // [ 1301, 'A', false, 23040127 ]
  result.forEach((value, index) => {
    if(!check) {
      check = (roomNumber == value[0] && bedCode == value[1] && studentId == value[3]);
    }
  });
  
  return check;
}

function query() {
  var request = STATUS_SHEET_REQUEST_URL + '&range=' + REQUEST_RANGE + '&tq=' + encodeURIComponent(REQUEST_QUERY_COMMAND);
  var request_result = UrlFetchApp.fetch(request).getContentText();    
  // get json object
  var _from = request_result.indexOf("{");
  var _to   = request_result.lastIndexOf("}") + 1; 
  var jsonText = request_result.slice(_from, _to);
  var parsedObject = JSON.parse(jsonText);
  if(parsedObject.status !== 'ok') {
    console.log("ERROR ", REQUEST_QUERY_COMMAND, request);
    throw new Error(REQUEST_QUERY_COMMAND + " : " + JSON.stringify(parsedObject));
  }  
  let columnCount = parsedObject.table.cols.length;
  var result = [];
  parsedObject.table.rows.forEach(row => {
    var rowValue = row.c;
    var _row = [];
    for(var k=0; k<columnCount; k++) {
      if(!rowValue[k]) {
        _row.push('');
      }
      else {
        _row.push(rowValue[k].v);
      }
    }
    result.push(_row);
  });
  return result;
}

function onEdit(e) {
  if(!e){
    return;
  }
  //
  let range_modified = e.range;
  if(range_modified.getRow() < 2) return;
  //
  var column = range_modified.getColumn();
  if(column == 10) {
    //
    var color = "black";
    const status = range_modified.getValue();
    switch(status) {
      case 'Deny' : color = "orange"; break;
      case 'Assigned' : color = "green"; break;
      case 'Fixed' : color = "blue"; break;
      case 'Pending' : color = "red"; break;
      default : color = "black"; 
    }
    range_modified.setFontColor(color);    
    // 상태 값이 변경되면, 그 변경 시각을 기록.
    range_modified.offset(0,1).setValue(new Date());
  }
  else if(column == 9) {
    // 
    var color = getColor(range_modified.getValue());
    range_modified.setFontColor(color);    
  }
}

/**
 * from response_tab to history_tab
 */
function doMoveForClose(row) {
  var historySheet = ws.getSheetByName(History_Tab);
  var lastColumn = listsSheet.getLastColumn();
  if(!historySheet) {
    ws.insertSheet(History_Tab);
    historySheet = ws.getSheetByName(History_Tab);
    // title copy
    var titleCopyFrom = listsSheet.getRange(1, 1, 1, lastColumn);
    var titleToPasteTo = historySheet.getRange(1, 1, 1, lastColumn);
    titleCopyFrom.copyTo(titleToPasteTo);
  }  
  // Get the range to move
  var rangeToCopyFrom = listsSheet.getRange(row, 1, 1, lastColumn);
  var lastRow = historySheet.getLastRow();
  // Get range to paste to
  var rangeToPasteTo = historySheet.getRange(lastRow + 1, 1, 1, lastColumn);
  // Copy and paste the data
  rangeToCopyFrom.copyTo(rangeToPasteTo);
  listsSheet.deleteRow(row);
}

/**
 * Reopen : from history_tab to response_tab
 */
function doMoveForReopen(row) {
  var historySheet = ws.getSheetByName(History_Tab);
  var lastColumn = historySheet.getLastColumn();

  // Get the range to move
  var rangeToCopyFrom = historySheet.getRange(row, 1, 1, lastColumn);
  var lastRow = listsSheet.getLastRow();
  // Get range to paste to
  var rangeToPasteTo = listsSheet.getRange(lastRow + 1, 1, 1, lastColumn);
  // Copy and paste the data
  rangeToCopyFrom.copyTo(rangeToPasteTo);
  historySheet.deleteRow(row);
}

function getColor(value) {
    var color = "black";
    switch(value) {
      case '전기' : color = "red"; break;
      case '기계' : color = "green"; break;
      case '영선' : color = "blue"; break;
      default : color = "black"; 
    }
    return color;
}

function onChange(e){
  /**
   * status change 를 등록된 사용자에게 notification 한다.
   */  
  if(e.changeType === 'EDIT') {
    let sheet = ws.getActiveSheet();
    let activeRange = sheet.getActiveRange();
    
    if(activeRange.getColumn() != 10) {
      // Status 만 처리
      return;
    }

    try {
      let status = activeRange.getValue();
      let row = activeRange.getRow();      
      notify(activeRange);
      //
      if(status == 'Fixed' || status == 'Closed' || status == 'Deny') {
        // Response List tab 에서만 작동
        if(activeRange.getSheet().getSheetName() !== 'Response List') return;
        doMoveForClose(row);
      }
      else if(status == 'Reopen') {
        // History Tab 에서만 작동
        if(activeRange.getSheet().getSheetName() !== 'History') return;
        doMoveForReopen(row);
      }
    }
    catch(ex) {
      console.log(ex);
    }    
  }
}
