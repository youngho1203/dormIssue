function onFormSubmit(e) {
  MailApp.sendEmail("sjdorm@sejong.ac.kr", e.values[1] + '에서 ' + e.values[3] + ' 민원 접수', 
                    '구글 시트를 확인해주세요.' + '\n' +
                    '------------------------------------' + '\n' +
                    '호실 :' + e.values[1] + '\n' +
                    '학번 :' + e.values[2] + '\n' +
                    '고장 유형 :' + e.values[3] + '\n' +
                    '상세 설명 :' + e.values[4] + '\n' +
                    '사진 링크 :' + e.values[5] + '\n' +
                    '이메일 :' + e.values[6] + '\n' +
                    '------------------------------------' + '\n' +
                    'Sheet Link : https://docs.google.com/spreadsheets/d/1x8ICjWgGy8G1WrEhYMLihDWjIgyLC8SIAyeQX4zTl0o/edit#gid=1297275685' + '\n' +
                    '------------------------------------'
                   );
}