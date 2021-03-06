import whenDomReady from 'when-dom-ready'

const Css = `
  #arly-ms {
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    z-index: 100000;
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 1rem;
    background: rgba(0,0,0,0.7);
    box-shadow: 0 0 3px 0 rgba(0,0,0,0.7);
    color: #fff;
    transition: opacity 0.3s;
    text-align: left;
  }

  #arly-ms.hidden {
    opacity: 0;
  }

  #arly-ms.gone {
    z-index: -1;
  }

  .arly-ms-text {
    flex: 1;
  }

  .arly-ms-rec {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    margin-right: 1rem;
    border-radius: 50%;
    background: #C91C2E;
    box-shadow: 0 0 5px 0 rgba(201,28,46,0.7);
  }

  .arly-ms-disable {
    color: #bbb;
    text
  }
`

const Html = (notificationText: string, disableText: string) => `
  <style>
    ${Css}
  </style>
  <div id="arly-ms">
    <span class="arly-ms-rec"></span>
    <span class="arly-ms-text">${notificationText}</span>

    <span class="arly-ms-disable">${disableText}</span>
  </div>
`

function getNotification(): HTMLDivElement | null {
  return document.querySelector('#arly-ms')
}

function notificationEvents(notification: HTMLDivElement | null): INotificationResult {
  const disable = new Promise(resolve => {
    const disableSpan = notification && notification.querySelector('.arly-ms-disable')
    disableSpan && disableSpan.addEventListener('click', resolve)
  })

  return {
    disable
  } as INotificationResult
}

export interface INotificationResult {
  disable: Promise<any>
}

export interface INotification {
  container?: HTMLElement | null
  text?: string
  disableText?: string
}

export const append: (notificationOptions?: INotification) => Promise<INotificationResult> = (
  notificationOptions: INotification = {}
) => {
  return new Promise(resolve => {
    const notification = getNotification()
    if (!notification) {
      whenDomReady().then(() => {
        const language = (navigator as any).language || (navigator as any).userLanguage
        const container: any = notificationOptions.container || document.body
        const notificationText =
          notificationOptions.text || `I am listening for your search. Your language is ${language}`
        const disableText = notificationOptions.disableText || `Disable`
        container.insertAdjacentHTML('beforeend', Html(notificationText, disableText))
        resolve(notificationEvents(getNotification()))
      })
    } else {
      notification.classList.remove('hidden', 'gone')
      resolve(notificationEvents(notification))
    }
  })
}

export const remove = () => {
  const notification = getNotification()
  if (notification) {
    notification.classList.add('hidden')
    setTimeout(() => notification.classList.add('gone'), 500)
  }
}
