const API_TOKEN_BOT = 'введите токен telegram бота';
// id главной таблицы
const sheetId = 'введите id таблицы';
// главная таблица
var sheet =  SpreadsheetApp.openById(sheetId).getSheets()[0]
 
const telegramUrl = 'https://api.telegram.org/bot' + API_TOKEN_BOT;
const webAppUrl = 'https://script.google.com/macros/s/'; //адрес веб развертывания из Google App Script

var chatId;
var msg;
var textMsg;
var arrayTextMsg;
var fromUser;

var errorMessage = ' <strong>Ошибка ввода</strong> \n' + 
                  'Введите сообщение в формате\n' +
                  '"[№]" номер станка для получения информации\n' +
                  '"[№] [ремонт] [затраченное время(мин)] [описание проблемы]"\n' +
                  '"[№] [обход] [описание проблемы(необязательно)]"\n';

// добавление Logger для записи логов в лист таблицы
  Logger = BetterLog.useSpreadsheet(sheetId);

function setWebhook() {
  let url = telegramUrl + '/setWebhook?url=' + webAppUrl;
  let resp = UrlFetchApp.fetch(url);
  Logger.log(resp)
}
 
function deleteWebhook() {
  let url = telegramUrl + '/deleteWebhook?url=' + webAppUrl;
  let resp = UrlFetchApp.fetch(url);
  Logger.log(resp)
}
 
function debug(contents) {
  
}

function doPost(e) {

  // получаем сигнал от бота
  var update = JSON.parse(e.postData.contents);

  // проверяем тип полученного, нам нужен только тип "сообщение"
  if (update.hasOwnProperty('message')) {
    msg = update.message; //JSON message
    textMsg = msg.text;   //техт сообщения
    arrayTextMsg = textMsg.split(" ");  // [0] - idMashine, [1] - command , [2 - size] - text
    chatId = msg.chat.id;   //id чата
    fromUser = msg.from.first_name + ' ' + msg.from.last_name + ' (' + msg.from.username + ')';   //инфо о пользователе
    var message; //сообщение для отправки пользователю

    //проверка что первый аргумент число
    if (!isNaN(parseFloat(arrayTextMsg[0])) && isFinite(arrayTextMsg[0])) { 
        if(arrayTextMsg.length == 1){ //если аргумент один отправляем информацию о станке

          var mashineSheetId = getMashineIdFromSheet(arrayTextMsg[0]); // [0] - idMashine
          message = getGeneralInformAboutMashine(mashineSheetId); 
          sendMessageToTelegram('text', message);         

        } else if(arrayTextMsg.length > 3 && arrayTextMsg[1] == 'ремонт') {
          setInformAboutService(arrayTextMsg);          

        } else if(arrayTextMsg.length >= 2 && arrayTextMsg[1] == 'обход') {
          message = ' <strong>Тест</strong> \n обход-' + fromUser + ' ' + arrayTextMsg + ' ' + arrayTextMsg.length;
          sendMessageToTelegram('text', message);   

        } else{                 
          sendMessageToTelegram('text', errorMessage);
        }
    } else {        
        sendMessageToTelegram('text', errorMessage); 
    }
     
    
  }
}

function sendMessageToTelegram(method, dataMessage) {
  var payload;

  //формируем сообщение для отправки
  if (method == 'photo')
  {
    
    var photoHref = 'https://docs.google.com/uc?export=view&id=';
    var photoID = dataMessage.replace('https://drive.google.com/file/d/', '').replace('/view?usp=sharing', '');
    payload = {
      'method': 'sendPhoto',
      'chat_id': String(chatId),
      'photo': photoHref + photoID,
      'parse_mode': 'HTML'
    }
    Logger.log(photoHref + photoID);
  }
  else if(method == 'text') {
    payload = {
      'method': 'sendMessage',
      'chat_id': String(chatId),
      'text': dataMessage,
      'parse_mode': 'HTML'
    }
  }
  //данные для отправки     
  var data = {
    "method": "post",
    "payload": payload
  }
  
  // и отправляем его боту
  UrlFetchApp.fetch('https://api.telegram.org/bot' + API_TOKEN_BOT + '/', data);  
}

function getMashineIdFromSheet(idFromMessage){
  
  // достаем 3 столбца из таблицы (id, название, id страницы)
  var arrayMashinesId = sheet.getRange(2, 1, sheet.getLastRow(), 3).getValues();

  var mashineSheetId;
  //получение названия станка по id
  for (var i = 0; i < sheet.getLastRow(); i++) {
    if (idFromMessage == arrayMashinesId[i][0]){              
      mashineSheetId = arrayMashinesId[i][0];  //если id совпадают то возвращаем id
    }
  }
  return mashineSheetId;
}

function getGeneralInformAboutMashine(mashineSheetId){
  var info = getInformAboutMashineById(mashineSheetId);

  sendMessageToTelegram('photo', info.photo); //Отправляем фото станка

  //формируем информацию о станке
  var message = '<strong>Информация</strong> \n' + 
            'Название станка - <strong>' + info.mashineName + '</strong>\n' +
            'Общая информация: ' + info.informAboutMashine + '\n';
  return message;  
}

function getInformAboutMashineById(mashineSheetId){
  var listAboutMashine = SpreadsheetApp.openById(sheetId).getSheetByName(mashineSheetId); //лист с информацией о станке
  var mashineName = listAboutMashine.getRange(2, 2).getValue();
  var informAboutMashine = listAboutMashine.getRange(10, 2).getValue();
  var photo = listAboutMashine.getRange(5, 2).getValue();

  return {
        mashineId : mashineSheetId,
        mashineName : mashineName,
        informAboutMashine : informAboutMashine,
        photo : photo
    };
}


