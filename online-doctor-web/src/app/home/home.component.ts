import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { Router } from '@angular/router';
import { WebsocketService } from '../service/websocket.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  doctorList: any = []; // Doctor list
  globalMessages: any = {}; // Map of doctor and message
  currentActiveMessageList: any = []; // Current Acitve message list
  currentActiveDoctorName: string = 'Start New consultation'; // Current Acitve message list

  showReplyBox: boolean = false;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    withCredentials: true,
  };

  @ViewChild("chatMessageContainer") chatMessageContainer: ElementRef;
  disableScrollDown: boolean = false;

  constructor(private router: Router, private authService: AuthService, private webSocketService: WebsocketService, private http: HttpClient) { }

  ngOnInit() {
    this.LoadMessageList();
    this.webSocketService.connect();
    this.InitWebSocketMessageReceiver();
  }

  ngOnDestroy() {
    this.webSocketService.disconnect();
  }

  InitWebSocketMessageReceiver() {
    this.webSocketService.messages.subscribe(
      (message: any) => {
        console.log("New Message received from server :: ", message);
        try {
          let messageJson = JSON.parse(message);
          this.messageHandler(messageJson);
        } catch (e) {
          console.log("Not able to parse message to json");
        }


      }, (err: any) => {
        console.log("Error while getting new message ", err);
      }
    )
  }

  fetchNewMessageForUser(userName) {
    console.log("Request to fetch the new message for user ", userName);
    var lastMessageId = 0;

    if (this.globalMessages[userName] != null && this.globalMessages[userName].messageId != null) {
      lastMessageId = this.globalMessages[userName].messageId;
    }

    console.log("last message id :: ", lastMessageId);

    let reqBody = {
      lastMessageId: lastMessageId,
      forUserName: userName
    };

    this.http.post(environment.MESSAGE_LIST_BY_USER_END_POINT, reqBody, this.httpOptions).subscribe(
      (res: any) => {
        console.log("Extra data found from server :: ", res);
        if (this.globalMessages[userName] == null) {
          this.globalMessages[userName] = res;
          this.prepareMessageList();
        } else {
          console.log("In else part");

          if (userName == 'Dr. Assistant') {
            var localMessageList = this.globalMessages[userName].messages;

            for (var i = localMessageList.length - 1; i >= 0; i--) {
              var localMessage = localMessageList[i];
              if (localMessage.oldMessage != undefined) {
                break;
              }
              localMessage.oldMessage = true;
            }

          }

          for (var i = 0; i < res.length; i++) {
            this.globalMessages[userName].messages.push(res[i]);
            if (this.globalMessages[userName].messageId < res[i].id) {
              this.globalMessages[userName].messageId = res[i].id;
            }
          }
          this.updateShortMessageAndTime(userName);
        }
      }, (err: any) => {
        console.log("Error occured while finding extra data from server", err);
      }
    )

  }

  updateShortMessageAndTime(doctorName) {

    for (var i = 0; i < this.doctorList.length; i++) {

      var doctor = this.doctorList[i];

      if (doctor.name == doctorName) {

        console.log("Doctor detail matched :: ", doctor);
        console.log("Last message id :: ", this.globalMessages[doctorName].messageId);
        console.log("GLobal message for doctor :: ", this.globalMessages[doctorName]);

        doctor.shortMessage = this.globalMessages[doctorName]['messages'][this.globalMessages[doctorName].messageId - 1].shortMessage;

        doctor.time = this.globalMessages[doctorName]['messages'][this.globalMessages[doctorName].messageId - 1].time

        console.log("now doctor detail :: ", doctor);
      }

    }
  }

  messageHandler(messageJson) {
    let task = messageJson.task;

    switch (task) {
      case 'NEW_MESSAGE_AVAILABLE': this.fetchNewMessageForUser(messageJson.from);
        break;
      default: console.log("Implementation for task not available :: ", task);
        break;
    }


  }

  LoadMessageList() {
    this.http.get(environment.MESSAGE_LIST_END_POINT, this.httpOptions).subscribe(
      (res: any) => {
        console.log("Message list found :: ", res);
        if (res == null) {
          this.globalMessages = {};
        } else {
          this.globalMessages = res;
          this.prepareMessageList();
        }

      }, (err: any) => {
        console.log("Error occured while finding message list for user");
      }
    )
  }

  prepareMessageList() {
    var localDoctorList = [];
    var doctorNames = Object.keys(this.globalMessages);
    for (var i = 0; i < doctorNames.length; i++) {
      var doctorName = doctorNames[i];
      var doctorDetail = {
        name: doctorName,
        designation: this.globalMessages[doctorName].designation,
        shortMessage: this.globalMessages[doctorName]['messages'][this.globalMessages[doctorName].messageId - 1].shortMessage,
        time: this.globalMessages[doctorName]['messages'][this.globalMessages[doctorName].messageId - 1].time
      }
      localDoctorList.push(doctorDetail);
    }
    this.doctorList = localDoctorList;
    if (this.doctorList.length > 0) {
      this.currentActiveDoctorName = this.doctorList[0].name;
      this.currentActiveMessageList = this.globalMessages[this.currentActiveDoctorName].messages;
    }
  }

  StartANewConsultation() {
    console.log("Request to start a new consultation");
    this.webSocketService.sendMessage({
      task: 'START_NEW_CONSULTATION'
    });
  }

  logOut() {
    console.log("Request to logout");
    this.authService.doLogOut();
    this.router.navigate(['login']);
  }


  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  onScroll() {
    let element = this.chatMessageContainer.nativeElement;
    let currentWindowPos = element.scrollHeight - element.scrollTop;
    let diff = currentWindowPos - element.clientHeight;
    diff = Math.abs(diff);
    if (this.disableScrollDown && diff <= 1) {
      this.disableScrollDown = false
    } else {
      this.disableScrollDown = true
    }
    //console.log(" On scroll called :: disableScroll down : ", this.disableScrollDown);
  }


  private scrollToBottom(): void {
    //console.log("Scroll to bottom :: ", this.disableScrollDown);
    if (this.disableScrollDown) {
      return
    }
    try {
      this.chatMessageContainer.nativeElement.scrollTo({ top: this.chatMessageContainer.nativeElement.scrollHeight, behavior: 'smooth' })
      // this.myScrollContainer.nativeElement.scroll
      //this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  setAnswer(message, answer) {
    message.answer = answer;
    return true;
  }

  OnAnswerSelected(message) {
    console.log("Answer selected for :: ", message);
  }



}
