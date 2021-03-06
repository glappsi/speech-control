import { Observable, Subscriber, empty, throwError, timer, from } from 'rxjs'
import { finalize, filter, debounceTime, repeatWhen, retryWhen, mergeMap } from 'rxjs/operators'
import { append, remove, INotificationResult, INotification } from './components/notification'

export enum SpeechControlErrors {
  NoSpeechRecognition = 'no-speech-recognition',
  Disabled = 'disabled'
}

export { INotification }

export interface IOptions {
  recLanguage?: string
}

export class SpeechControl {
  _recognition?: SpeechRecognition
  _observable?: Observable<SpeechRecognitionEvent>
  _stopped = false
  _notificationShown = false
  notification?: INotification
  recLanguage?: string

  constructor(options?: IOptions) {
    this.recLanguage = options && options.recLanguage
    this.notification = {}
  }

  _record(subscriber: Subscriber<SpeechRecognitionEvent>) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    this._recognition = new SpeechRecognition()

    if (this._recognition) {
      // this._recognition.continuous = true
      if (this.recLanguage) {
        this._recognition.lang = this.recLanguage
      }
      this._recognition.onresult = subscriber.next.bind(subscriber)

      this._recognition.onend = subscriber.complete.bind(subscriber)

      this._recognition.onerror = subscriber.error.bind(subscriber)

      this._recognition.start()
    }
  }

  _disableRec() {
    window.sessionStorage.setItem('ARLY_DISABLE_REC', 'true')
    this.stop()
  }

  public askForPermission(): Observable<any> {
    return from(
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // stop it immediately, its just used to trigger the permission
        stream.getTracks().forEach(function(track) {
          track.stop()
        })
      })
    )
  }

  public whenPermissionGranted(): Observable<any> {
    if (!(navigator as any).permissions) {
      console.warn('SPEECH CONTROL: PERMISSIONS API IS NOT AVAILABLE, USING getUserMedia HERE')
      return this.askForPermission()
    }

    const handleState = (subscriber: Subscriber<any>, status: PermissionStatus) => {
      if (status.state == 'granted') {
        subscriber.next()
        subscriber.complete()
      } else if (status.state == 'prompt') {
        status.addEventListener('change', ({ target }) => {
          handleState(subscriber, target as PermissionStatus)
        })
      } else {
        subscriber.error()
      }
    }

    return new Observable(subscriber => {
      ;(navigator as any).permissions
        .query({ name: 'microphone' })
        .then((status: PermissionStatus) => handleState(subscriber, status))
    })
  }

  public isEnabled() {
    // check if not disabled and speech _recognition available
    return (
      !window.sessionStorage.getItem('ARLY_DISABLE_REC') &&
      (window.hasOwnProperty('SpeechRecognition') ||
        window.hasOwnProperty('webkitSpeechRecognition'))
    )
  }

  public setNotification(notification: INotification) {
    this.notification = notification
  }

  public on(term: string): Observable<SpeechRecognitionEvent> {
    if (!this._observable) {
      this._observable = this.start().pipe(finalize(() => (this._observable = undefined)))
    }

    return this._observable.pipe(
      filter(event => {
        const item = event.results
          .item(event.results.length - 1)[0]
          .transcript.trim()
          .toLowerCase()
          .replace(/\s/g, ', ')

        return item.includes(term)
      })
    )
  }

  public start(notificationOptions?: INotification): Observable<SpeechRecognitionEvent> {
    this._stopped = false
    return new Observable<SpeechRecognitionEvent>(subscriber => {
      if (this.isEnabled()) {
        this._record(subscriber)

        this.whenPermissionGranted().subscribe(() => {
          if (!this._notificationShown) {
            const notification = append(notificationOptions || this.notification)
            notification.then((nr: INotificationResult) =>
              nr.disable.then(() => {
                this._disableRec()
                subscriber.error(SpeechControlErrors.Disabled)
              })
            )

            setTimeout(remove, 3000)
            this._notificationShown = true
          }
        })
      } else {
        subscriber.error(SpeechControlErrors.NoSpeechRecognition)
      }
    }).pipe(
      debounceTime(500),
      repeatWhen((complete: Observable<any>) => {
        return complete.pipe(
          mergeMap(() => {
            // repeat because continouse does not work on all mobile devices
            if (this._stopped) {
              return empty()
            }
            return timer(500)
          })
        )
      }),
      retryWhen((error: Observable<any>) => {
        return error.pipe(
          mergeMap((error: any) => {
            console.log(error)
            // retry if noting said
            if (error && error.error === 'no-speech') {
              return timer(500)
            }
            return throwError(error)
          })
        )
      })
    )
  }

  public stop() {
    remove()
    this._stopped = true
    if (this._recognition) {
      this._recognition.stop()
    }
  }
}
