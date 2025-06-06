document.querySelectorAll(".product-gallery__enlarge-button, modal-opener").forEach((element) => {
  element.addEventListener("click", () => {
    Fancybox.bind('[data-fancybox="gallery"]', {
      Toolbar: {
        items: {
          share: {
            tpl: '<button class="f-button" data-fancybox-fullshare><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.5632 15.6251C16.5633 16.0356 16.4735 16.4411 16.3001 16.8132C16.1267 17.1853 15.874 17.5149 15.5597 17.779C15.2454 18.043 14.8771 18.235 14.4806 18.3416C14.0842 18.4481 13.6692 18.4666 13.2649 18.3956C12.8606 18.3247 12.4767 18.1662 12.1401 17.9311C11.8036 17.696 11.5226 17.3901 11.3169 17.0349C11.1112 16.6796 10.9857 16.2837 10.9493 15.8748C10.9129 15.4659 10.9665 15.054 11.1062 14.668L6.96557 12.0079C6.57011 12.3958 6.06891 12.6583 5.52483 12.7624C4.98076 12.8665 4.41804 12.8077 3.90729 12.5933C3.39653 12.3788 2.96048 12.0183 2.65383 11.557C2.34718 11.0956 2.18359 10.554 2.18359 10.0001C2.18359 9.44611 2.34718 8.90449 2.65383 8.44316C2.96048 7.98182 3.39653 7.62132 3.90729 7.40686C4.41804 7.19241 4.98076 7.13356 5.52483 7.2377C6.06891 7.34185 6.57011 7.60434 6.96557 7.99225L11.1062 5.336C10.8691 4.68447 10.8804 3.96842 11.1378 3.32468C11.3953 2.68093 11.881 2.15463 12.502 1.84633C13.123 1.53803 13.8358 1.46936 14.5043 1.65343C15.1727 1.8375 15.7499 2.26141 16.1256 2.84416C16.5012 3.42691 16.649 4.12763 16.5406 4.81244C16.4323 5.49725 16.0754 6.11813 15.5382 6.55643C15.001 6.99473 14.3211 7.21973 13.6285 7.18844C12.9358 7.15714 12.279 6.87174 11.7835 6.38678L7.64292 9.04693C7.8667 9.66533 7.8667 10.3426 7.64292 10.961L11.7835 13.6212C12.1789 13.2342 12.6795 12.9725 13.2228 12.8687C13.7662 12.7649 14.328 12.8236 14.8382 13.0374C15.3483 13.2513 15.7841 13.6109 16.0909 14.0711C16.3977 14.5314 16.562 15.0719 16.5632 15.6251Z" fill="#000"/></svg></button>',
            click: () => {
              const canShare = "share" in window.navigator;
              const shareUrl = window.location.href + "";

              if (canShare) {
                navigator
                  .share({
                    title: document.title,
                    url: shareUrl,
                  })
                  .catch(() => {
                    return;
                  });
              } else {
                const shareElement = document.querySelector("[data-share]");
                Share(shareElement);
              }
            },
          },
          fullscreen: {
            tpl: '<button class="f-button" data-fancybox-fullscreen><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#000000" height="32px" width="32px" version="1.1" id="Capa_1" viewBox="0 0 384.97 384.97" xml:space="preserve"><g><g id="Fullscreen"><path d="M384.97,12.03c0-6.713-5.317-12.03-12.03-12.03H264.847c-6.833,0-11.922,5.39-11.934,12.223    c0,6.821,5.101,11.838,11.934,11.838h96.062l-0.193,96.519c0,6.833,5.197,12.03,12.03,12.03c6.833-0.012,12.03-5.197,12.03-12.03    l0.193-108.369c0-0.036-0.012-0.06-0.012-0.084C384.958,12.09,384.97,12.066,384.97,12.03z" fill="#fff"/><path d="M120.496,0H12.403c-0.036,0-0.06,0.012-0.096,0.012C12.283,0.012,12.247,0,12.223,0C5.51,0,0.192,5.317,0.192,12.03    L0,120.399c0,6.833,5.39,11.934,12.223,11.934c6.821,0,11.838-5.101,11.838-11.934l0.192-96.339h96.242    c6.833,0,12.03-5.197,12.03-12.03C132.514,5.197,127.317,0,120.496,0z" fill="#fff"/><path d="M120.123,360.909H24.061v-96.242c0-6.833-5.197-12.03-12.03-12.03S0,257.833,0,264.667v108.092    c0,0.036,0.012,0.06,0.012,0.084c0,0.036-0.012,0.06-0.012,0.096c0,6.713,5.317,12.03,12.03,12.03h108.092    c6.833,0,11.922-5.39,11.934-12.223C132.057,365.926,126.956,360.909,120.123,360.909z" fill="#fff"/><path d="M372.747,252.913c-6.833,0-11.85,5.101-11.838,11.934v96.062h-96.242c-6.833,0-12.03,5.197-12.03,12.03    s5.197,12.03,12.03,12.03h108.092c0.036,0,0.06-0.012,0.084-0.012c0.036-0.012,0.06,0.012,0.096,0.012    c6.713,0,12.03-5.317,12.03-12.03V264.847C384.97,258.014,379.58,252.913,372.747,252.913z" fill="#fff"/></g><g></g><g></g><g></g><g></g><g></g><g></g></g></svg></button>',
            click: () => {
              const elem = document;
              if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                if (elem.exitFullscreen) {
                  elem.exitFullscreen();
                } else if (elem.webkitExitFullscreen) {
                  /* Safari */
                  elem.webkitExitFullscreen();
                } else if (elem.msExitFullscreen) {
                  /* IE11 */
                  elem.msExitFullscreen();
                }
              } else {
                const docElem = document.documentElement;
                if (docElem.requestFullscreen) {
                  docElem.requestFullscreen();
                } else if (docElem.webkitRequestFullscreen) {
                  /* Safari */
                  docElem.webkitRequestFullscreen();
                } else if (docElem.msRequestFullscreen) {
                  /* IE11 */
                  docElem.msRequestFullscreen();
                }
              }
            },            
          },
        },
        display: {
          left: ["infobar"],
          middle: [],
          right: ["zoomIn", "zoomOut", "fullscreen", "close"],
        },
      },
    });
  })
});