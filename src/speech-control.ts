import { Observable, Subscriber } from 'rxjs'
import { finalize, filter } from 'rxjs/operators'
import { append, remove, INotificationResult } from './components/notification'

export enum SpeechControlErrors {
  NoSpeechRecognition = 'no-speech-recognition',
  Disabled = 'disabled'
}

export class SpeechControl {
  _recognition?: SpeechRecognition
  _observable?: Observable<SpeechRecognitionEvent>
  notification: {
    container?: HTMLElement | null
    text?: string
  }
  recLanguage?: string

  constructor(recLanguage?: string) {
    this.recLanguage = recLanguage
    this.notification = {}
  }

  _record(subscriber: Subscriber<SpeechRecognitionEvent>) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    this._recognition = new SpeechRecognition()

    if (this._recognition) {
      this._recognition.continuous = true
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

  public isEnabled() {
    // check if not disabled and speech _recognition available
    return (
      !window.sessionStorage.getItem('ARLY_DISABLE_REC') &&
      (window.hasOwnProperty('SpeechRecognition') ||
        window.hasOwnProperty('webkitSpeechRecognition'))
    )
  }

  public setNotification(container?: HTMLElement | null, text?: string) {
    this.notification = { container, text }
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

        console.log('filter', item, term)

        return item.includes(term)
      })
    )
  }

  public start(): Observable<SpeechRecognitionEvent> {
    return new Observable<SpeechRecognitionEvent>(subscriber => {
      if (this.isEnabled()) {
        const notification = append(this.notification.container, this.notification.text)
        notification.then((nr: INotificationResult) =>
          nr.disable.then(() => {
            this._disableRec()
            subscriber.error(SpeechControlErrors.Disabled)
          })
        )

        setTimeout(remove, 3000)

        this._record(subscriber)
      } else {
        subscriber.error(SpeechControlErrors.NoSpeechRecognition)
      }
    })
  }

  public stop() {
    if (this._recognition) {
      this._recognition.stop()
    }
  }
}
