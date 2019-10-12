# Speech Control

A simple class to start and observe speech input.
It also adds a simple notification which lets the user disable 

## Usage

### Start the recognition

Call the start function and the notification will appear which tells the user the app is listening.
It will return an observable which calls the next handler on every user input with the corresponding `SpeechRecognitionEvent`.
It will fail if the speech recognition fails or the user disables it with the corresponding events.
It will finish after calling `.stop()`.

```
  const speechControl = new SpeechControl();
  speechControl
    .start()
    .subscribe(SpeechRecognitionEvent => {}, SpeechControlErrors | SpeechRecognitionError => {}, Event => {})
```

### Listening for a specific word

You can also just listen for specific keywords/phrases. In this case the subscribe handler just gets called when user said this word.

```
  const speechControl = new SpeechControl();
  speechControlContinue = speechControl.on('continue').subscribe(SpeechRecognitionEvent => {}, SpeechControlErrors | SpeechRecognitionError => {}, Event => {});
```

### Permission Handling

There are two ways to handle permissions. You can ask the user directly or wait for him to allow the microphone permission.

- `askForPermission(): Observable<any>`: triggers the microphone permission prompt and completes when the user allows, errors when denied
- `whenPermissionGranted(): Observable<any>`: completes when the microphone permission is granted, errors when denied

### Other

- `setNotification({container?: HtmlElement, text?: string, disableText?:string}): void`: lets you customize the notification
- `isEnabled(): boolean`: checks if SpeechRecognition is supported or user disabled the speech recognition
- `stop(): void`: stops the recognition and removes the notification

### Options

```
const speechControl = new SpeechControl(options?);
```

- `recLanguage`: set the recording language, default is the HTML document language or users browser language