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
const historySheet = ws.getSheetByName("Report History");
const templateName = '시설 민원';

function sendNotification() {
  let now = new Date();
  var dataArray = hasNewOne(now);
  if(dataArray.length > 0){
    var allOpenNumber = listsSheet.getRange("J2:J").getValues().filter(a => a[0] == 'Open').length;
    // simple trick to set Date
    var targetEmailList = configSheet.getRange("C24").getValue();
    sendEmail(now, targetEmailList, dataArray, allOpenNumber);    
  }
}

/**
 * 새로 등록된 민원이 있는지 확인
 */
function hasNewOne(now) {
  // 상태가 Open 이고, 등록 날짜가 오늘인 경우
  let date = _getISOTimeZoneCorrectedDateString(now);
  return (listsSheet.getRange("A2:J").getValues().filter(a => (a[9] == 'Open')).filter(a => (_getISOTimeZoneCorrectedDateString(a[0]) == date)));  
}

function sendEmail(now, targetEmailList, dataArray, allOpenNumber){
  var data = [now, , ''];
  try {
    var templateFile_1 = HtmlService.createTemplateFromFile(templateName + " 앞부분");
    templateFile_1.date = now;
    templateFile_1.newOpenIssue = dataArray;
    templateFile_1.allOpenNumber = allOpenNumber;
    //
    var templateFile_2 = HtmlService.createTemplateFromFile(templateName + " 뒷부분");
    templateFile_2.url = ws.getUrl();
    templateFile_2.gid = listsSheet.getSheetId();
    //
    var htmlMessage = new StringBuilder();
    htmlMessage.append(templateFile_1.evaluate().getContent());
    //
    /**  
     * dataArray : [
      * 타임스탬프, 
      * Room Number - Code(1234A), 
      Student ID, 
      * Malfunction Type, 
      * Detail Description ( Single issue description only per single submit ), 	
      Malfunction Picture or Video,	
      이메일 주소,	
      구분,	
      * 유형,	
      상태
      ]
    */
    var skipIndex = [2, 5, 6, 7, 9];
    var titleArray = [
      '등록 시간',
      'Room Number',
      'Malfunction Type',
      'Detail Description',
      '유형'
    ]
    htmlMessage.append("<table class='gmail-table' style='border: solid 1px #336B6B; border-collapse: collapse; border-spacing: 0; font: normal 14px Roboto, sans-serif;'>");
    htmlMessage.append("<thead>");
    htmlMessage.append("<tr>");
    titleArray.forEach((title, index) => {
      htmlMessage.append("<th class='");
      htmlMessage.append("col");
      htmlMessage.append((index + 1));
      htmlMessage.append("' style='background-color: #DDEFEF; border: solid 1px #336B6B; color: #336B6B; padding: 4px; text-align: center; text-shadow: 1px 1px 1px #fff;'>");
      htmlMessage.append(title);
      htmlMessage.append("</th>");
    });
    htmlMessage.append("</thead>");
    htmlMessage.append("<tbody>");
    htmlMessage.append("</tr>");    
    dataArray.forEach(issue => {
      htmlMessage.append("<tr>");
      issue.forEach((col, index) => {
        if(!skipIndex.includes(index) ){
          htmlMessage.append("<td class='");
          htmlMessage.append("col");
          htmlMessage.append((index + 1));
          htmlMessage.append("' style='border: solid 1px #336B6B; color: #333; padding: 4px; text-align: center; text-shadow: 1px 1px 1px #fff;'>");
          htmlMessage.append(col);
          htmlMessage.append("</td>");
        }
      });
      htmlMessage.append("</tr>");
    });
    htmlMessage.append("</tbody>");
    htmlMessage.append("</table>");
    //
    htmlMessage.append(templateFile_2.evaluate().getContent());
    //
    var subject = "[광토기숙사(교환학생, 외국인학생)] 신규 시설 민원이 등록 되었습니다.";
    targetEmailList.split(',').forEach(address => {
      GmailApp.sendEmail(address, subject, '', { htmlBody: htmlMessage.toString() });
    });    
    //
    data[1] ='SENT';    
  }
  catch(ex) {
    data[1] = ex.stack;  
  }
  // 
  historySheet.appendRow(data);  
}

//
// Status Option Change Notification
//
function notify(range) {
    let status = range.getValue();
    let values = range.offset(0,-9,1,12).getValues()[0];
    configSheet.getRange("C2:C8").getValues().forEach((value,index) => { if(value[0] == status) {
      let targetEmailList = configSheet.getRange(index + 2, 4).getValue();
      if(targetEmailList !== '') {
        let dateTime = _getISOTimeZoneCorrectedDateString(new Date(values[0]),true);
        let subject = dateTime + ' 에 ' + values[1] + " 학생이 등록한 민원의 상태가 '" + status + "' 이(가) 되었습니다.";
        let message_array = title_array.map(function(el, i) {
          return el + ' : ' + values[i];
        });
        let message = message_array.toString().replaceAll(',','\n') + '\n\n' +
          '------------------------------------' + '\n' +
          'Sheet Link : https://docs.google.com/spreadsheets/d/1x8ICjWgGy8G1WrEhYMLihDWjIgyLC8SIAyeQX4zTl0o#gid=1297275685' + '\n' +
          '------------------------------------';
        targetEmailList.split(',').forEach(
          address =>  {
            GmailApp.sendEmail(address, subject, message);
          }
        );
      }
    }});
  }