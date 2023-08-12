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

function setInitialValue(e) {
  //
  // 새로운 행(새로운 민원)이 입력되었을 때 Call
  // 이 Method 는 이 화면 우측 메뉴의 트리거 메뉴에서 '트리거 추가'>'새로운 응답이 추가 될때' 를 등록해야 작동함. 
  // Set Initial Value 
  //
    const range_modified = e.range;
    if(range_modified.getSheet().getSheetName() !== 'Response List') return;
    if(range_modified.getRow() < 2) return;
    // console.log("Call setInitialValue");
    
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
    listsSheet.getRange(range_modified.getRow(), 10).setValue('Open');
  }    

function onEdit(e) {
  //
  // 상태 Cell 값이 변경되었을 때 Call
  // 이 Method 는 SpreadSheet 에 Default 로 등록이 되어 있슴. ( 별도의 트리거 등록 없이 cell 값이 변하면 항상 Call )
  //
  const range_modified = e.range;
  // console.log("Call onEdit");
  // if(range_modified.getSheet().getSheetName() !== 'Response List') return;
  if(range_modified.getRow() < 2) return;
  var column = range_modified.getColumn();
  var status = range_modified.getValue();

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
  //
  if(status == 'Fixed' || status == 'Closed' || status == 'Deny') {
    // Response List tab 에서만 작동
    if(range_modified.getSheet().getSheetName() !== 'Response List') return;
    var row = range_modified.getRow();
    doMoveForClose(row);
  }
  else if(status == 'Reopen') {
    // History Tab 에서만 작동
    if(range_modified.getSheet().getSheetName() !== 'History') return;
    var row = range_modified.getRow();
    doMoveForReopen(row);
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
