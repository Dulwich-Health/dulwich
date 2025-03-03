function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

window.updateCartTotalPrice = function () {
  fetch('/cart.js')
    .then(response => response.json())
    .then(cart => {
      const totalPrice = (cart.total_price || 0) / 100;
      const formattedPrice = `£${totalPrice.toFixed(2)}`;
      const totalPriceHeader = document.getElementById('cart-header-price');
      const totalPriceCartElements = document.querySelectorAll('#cart-page-total-price');
      if (totalPriceHeader) {
        totalPriceHeader.innerHTML = `/${formattedPrice}`;
      }
      if (totalPriceCartElements.length > 0) {
        totalPriceCartElements.forEach(element => {
          element.innerHTML = formattedPrice;
        });
      }
      const cartCollection = document.querySelector(".cart-collection");
      if (cartCollection) {
        if (cart.item_count === 0) {
          cartCollection.classList.add("hidden");
        } else {
          cartCollection.classList.remove("hidden");
        }
      }
    })
    .catch(error => {
      console.log(error);
    });
};

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll('button:not(.localization-selector)').forEach((button) =>
      button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true }
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout (() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
      (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;

    if (customElements.get('product-gallery')) {
      const productGallery = document.getElementById(`ProductGallery-${this.dataset.section}`);
  
      if (!this.currentVariant.featured_media) {
        productGallery?.showAllMedia();
        return;
      }
  
      productGallery?.setActiveMedia(this.currentVariant.featured_media);
    } else {
      if (!this.currentVariant.featured_media) return;
  
      const mediaGalleries = document.querySelectorAll(`[id^="MediaGallery-${this.dataset.section}"]`);
      mediaGalleries.forEach((mediaGallery) =>
        mediaGallery?.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true)
      );
  
      const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
      if (!modalContent) return;
      const newMediaModal = modalContent.querySelector(`[data-media-id="${this.currentVariant.featured_media.id}"]`);
      modalContent.prepend(newMediaModal);
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    //console.log(selectedOptionOneVariants);
    const inputWrappers = [...this.querySelectorAll('.product-form__input:not(#variant-radios-sync)')];

    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
        
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(
          `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const sizeChartPriceDestination = document.getElementById(`size-chart-product-price-${this.dataset.section}`);
        const sizeChartPriceSource = html.getElementById(
          `size-chart-product-price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(
          `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        const volumePricingSource = html.getElementById(
          `Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );

        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(`Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`);

        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (sizeChartPriceDestination && sizeChartPriceSource) {
          sizeChartPriceDestination.innerHTML = sizeChartPriceSource.innerHTML;
        }
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('visibility-hidden', skuSource.classList.contains('visibility-hidden'));
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('visibility-hidden', pricePerItemSource.classList.contains('visibility-hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');

        if (inventoryDestination)
          inventoryDestination.classList.toggle('visibility-hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
          window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
    if (inventory) inventory.classList.add('visibility-hidden');
    if (sku) sku.classList.add('visibility-hidden');
    if (pricePerItem) pricePerItem.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (!this.querySelector('slideshow-component') && this.classList.contains('complementary-products')) {
            this.remove();
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  }
}

customElements.define('product-recommendations', ProductRecommendations);

// Custom JS
class MMvariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);

    this.productFormSelector = `product-form--${ this.dataset.section }--${ this.dataset.pid }`;
    this.priceSelector = `price--${ this.dataset.section }--${ this.dataset.pid }`;
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updateVariantStatuses();
    this.updateComplementaryProductCheckbox()

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateVariantInput();
      this.renderProductCard();
    }
  }

  updateComplementaryProductCheckbox() {    
    this.complementaryProductCheckbox = this.closest('[data-selector="marmeto-product-card"]')?.querySelector('[type="checkbox"][name="id"]'); 
       
    if (!this.complementaryProductCheckbox) return;

    this.complementaryProductCheckbox?.classList.remove('hidden')

    if (this.complementaryProductCheckbox && !this.currentVariant?.available) {
      this.complementaryProductCheckbox.classList.add('hidden')
    }

    this.complementaryProductCheckbox.value = this.currentVariant.id;
    this.complementaryProductCheckbox.dataset.price = this.currentVariant.price;
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll('#' + this.productFormSelector);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
    });
  }

  async renderProductCard() {
    this.productCard = this.closest('marmeto-product-card');
    this.sectionId = this.productCard.dataset.sectionId;
    this.productHandle = this.productCard.dataset.productHandle;
    this.templateParam = this.closest('multi-product-form') ? 'card-complementary' : 'card';
    let variantUrl = `/products/${this.productHandle}?view=${this.templateParam}&variant=${this.currentVariant.id}&section=${this.sectionId}`;
  
    try {
      // Fetch the data
      const response = await fetch(variantUrl);
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');
      const responseCard = html.querySelector('marmeto-product-card');
  
      this.productCard.innerHTML = responseCard.innerHTML;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  
  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(variant => this.querySelector(':checked').value === variant.option1);
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')]
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants.filter(variant => variant.available && variant[`option${ index }`] === previousOptionSelected).map(variantOption => variantOption[`option${ index + 1 }`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue)
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace('[value]', input.getAttribute('value'));
      }
    });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(this.productFormSelector);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(this.productFormSelector);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(this.priceSelector);

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('mm-variant-selects', MMvariantSelects);

class MMvariantRadios extends MMvariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach(input => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('mm-variant-radios', MMvariantRadios);

class TabbedContent extends HTMLElement {
  constructor(){
    super();

    this.tabHeaders = this.querySelector('tab-headings');
    this.tabContents = this.querySelector('tab-contents');
    if(this.tabHeaders.children.length > 0 && this.tabContents.children.length > 0){
      Array.from(this.tabHeaders.children).forEach((tab)=>{
        tab.addEventListener('click',(event)=>{
          this.openTab(event.target);
        })
      })
    }
  }

  openTab(target){
    const activeTab = target;
    Array.from(this.tabHeaders.children).forEach((tab)=>{
      if (tab.dataset.tab == activeTab.dataset.tab) {
        tab.setAttribute('data-active','')
      } else{
        tab.removeAttribute('data-active')
      }
    })

    Array.from(this.tabContents.children).forEach((tab)=> {
      if (tab.dataset.tab == activeTab.dataset.tab) {
        tab.setAttribute('data-active','')
      } else {
        tab.removeAttribute('data-active')
      }
    })
  }
}

customElements.define('tabbed-content', TabbedContent);

class InfinitePageLoader extends HTMLElement {
  constructor() {
    super();

    this.sectionID = this.dataset.section || document.querySelector('infinite-page-loader')?.dataset.section || ''
    this.collectionInnerElement = document.querySelector('#product-grid')
    this.saveScrollPoint();
    this.restoreScrollPoint();
  }

  connectedCallback() {
    this.init()
  }

  init() {
    this.addObserver();
  }

  addObserver() {
    const observer = new window.IntersectionObserver(([entry]) => {

      if (entry.isIntersecting) {          
          if (entry.target == this.loadActivatorElem)
            observer.disconnect();

          var nextPageUrl = this.getNextPageUrl()

          if (nextPageUrl)
            this.loadProducts(nextPageUrl)
        }

    }, {
      root: null,
      threshold: 0.1
    })
      
    observer.observe(this)
  }

  getNextPageUrl() {
    var nextPage = parseInt(this.dataset.currentpage) + 1;

    if (nextPage > this.dataset.totalpages) {
      return false
    }

    return this.constructURLWithSearchParams(nextPage)
  }

  constructURLWithSearchParams(page) {
    var params = new URLSearchParams(document.location.search)
    var nextPage = parseInt(page) || parseInt(this.dataset.currentpage) + 1;
    var pageParam = this.dataset.pageParam || 'page'

    params.set(pageParam, nextPage)
    // params.set('filter.v.availability', 1) // To set the available products by default
    
    var searchParamsAsString = params.toString() 

    return "".concat(window.location.pathname, "?").concat(searchParamsAsString)
  }

  updateCurrentURL(url) {
    if (history.replaceState) {
      window.history.pushState({
        path: url
      }, '', url);
    }
  }

  loadProducts(url) {
    if (this.classList.contains('loading')) return;

    this.classList.add('loading')
    this.querySelector('div').classList.remove('hidden')

    this.getAndInsertHtml(url, 'append')
  }

  getAndInsertHtml(url, insertPosition) {
    var _this4 = this;

    if (this.abortController) {
      this.abortController.abort();
    }
    var currentUrl = new URL(url, window.location.href);
    currentUrl.searchParams.set('section_id', this.sectionID);

    try {
      this.abortController = new AbortController();

      fetch(currentUrl.toString(), {
        signal: this.abortController.signal
      }).then(function (response) {
        response.text().then(function (content) {
          var tempElement = new DOMParser().parseFromString(content, "text/html");

          if (insertPosition == 'append') {
            //Appending new sets of product cards
            _this4.collectionInnerElement.insertAdjacentHTML('beforeend', tempElement.querySelector('#product-grid').innerHTML);
            _this4.dataset.currentpage = tempElement.querySelector('infinite-page-loader').dataset.currentpage
            _this4.dataset.totalpages = tempElement.querySelector('infinite-page-loader').dataset.totalpages
          }
          else if (insertPosition == 'prepend')  {
            _this4.collectionInnerElement.insertAdjacentHTML('afterbegin', tempElement.querySelector('#product-grid').innerHTML);
            _this4.dataset.currentpage = tempElement.querySelector('load-previous-page').dataset.currentpage
          }
          
          _this4.init();
          _this4.saveScrollPoint();

          _this4.classList.remove('loading')
          _this4.querySelector('div').classList.add('hidden')
        });
      });
    } catch (exception) {}
  }

  saveScrollPoint() {
      let productCards = document.querySelectorAll("marmeto-product-card");
  
      productCards.forEach((productCard) => {
        const observer = new IntersectionObserver((entries) => {
            observerCallback(entries, observer, productCard)
        },
        {threshold: 0.7});    
        observer.observe(productCard); // Observing each product card that is visible

         productCard.addEventListener('click', () => {
          sessionStorage.setItem("lastElementId", productCard.id);  
        });
      })
    
      const observerCallback = (entries, observer, header) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting && entry.target.dataset.page) {
              this.updateCurrentURL(this.constructURLWithSearchParams(entry.target.dataset.page)) //updating the url depending on the product viewed
          }
        });
      };
  }

  restoreScrollPoint() {
    // Returning if browser is safari as it gets scrolled to top after scrollIntoView method is used.
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) return;
    
    history.scrollRestoration = "manual";
    // Reverting back to the previous element that was being viewed. 
    window.onload = function() {
      var lastElementId = sessionStorage.getItem("lastElementId");
      var lastElement = document.getElementById(lastElementId);

      if (lastElement) 
          lastElement.scrollIntoView();
          
      sessionStorage.removeItem('lastElementId'); 
    };
  }
}

customElements.define('infinite-page-loader', InfinitePageLoader);

class LoadPreviousPage extends InfinitePageLoader {
  constructor() {
    super();

    this.addEventListener('click', this.loadProducts.bind(this));
  }

  connectedCallback() {
    this.init()
  }

  init() {
    var infinitePageLoader = document.querySelector('infinite-page-loader') 
    var maxPagesLoadable = this.dataset.totalpages - 1;

    if (infinitePageLoader.dataset.currentpage - this.dataset.currentpage == maxPagesLoadable //when all the pages are loaded
      || this.dataset.currentpage == 1) { // When user is at page 1
        this.classList.add('hidden')
    } else {
      this.classList.remove('hidden')
    }
  }

  loadProducts() {
    if (this.classList.contains('loading')) return;
    
    var prevPageUrl = this.getPrevPageUrl()

    if (prevPageUrl) {
      this.classList.add('loading')
      this.getAndInsertHtml(prevPageUrl, 'prepend')
    }
  }

  getPrevPageUrl() {
    var prevPage = parseInt(this.dataset.currentpage) - 1;

    if (prevPage < 1) {
      return false
    }

    return this.constructURLWithSearchParams(prevPage)
  }
}

customElements.define('load-previous-page', LoadPreviousPage);

// custom-element.js
class MarmetoWishlist extends HTMLInputElement {
  static pendingOperations = [];

  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', this.debounce(this.handleCheckboxChange, 300));
  }

  handleCheckboxChange() {
    const value = JSON.parse(this.value);
    const [customerId, productId] = value;
    const action = this.checked ? 'add' : 'remove';
    const removeDeselectedWishlistCard = this.dataset.removeDeselectedWishlistCard == 'true';
    MarmetoWishlist.customerId = customerId; // Converting the customer ID to class variable

    if (!this.checked && removeDeselectedWishlistCard) this.removeProductCard();

    // Create an operation object
    const operation = { productId, action };

    MarmetoWishlist.pendingOperations.push(operation);
    MarmetoWishlist.handleBatchOperations();

    this.updateAllWishlistIcons();
  }

  static async handleBatchOperations(operations = MarmetoWishlist.pendingOperations) {
    if (operations.length === 0) {
      return; // No operations to perform
    }
  
    // Storing it to localStorage in case the user switches page
    localStorage.setItem('pendingWishlistOperations', JSON.stringify(operations))

    // Check if there is an ongoing network request
    if (MarmetoWishlist.abortController) {
      MarmetoWishlist.abortController.abort();
    }

    MarmetoWishlist.abortController = new AbortController();

    // Define the URL
    const deploymentId = 'AKfycbxofXo41CrTlhljyDZFjtNp8WnCZD5PKRv9O6m11kF3bSN0KI5GqD1nQqhFbwTvoXpISA'
    const url = `https://script.google.com/macros/s/${deploymentId}/exec`;
    const payloadData = {
      customerId: MarmetoWishlist.customerId,
      operations
    };

    // Create the fetch options
    const options = {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadData),
      signal: MarmetoWishlist.abortController.signal
    };

    // Perform the operation
    try {
      const response = await fetch(url, options);
      // Clear the pendingOperations
      localStorage.removeItem('pendingWishlistOperations')
      MarmetoWishlist.pendingOperations = [];

    } catch (error) {
      console.error(`Error in request:`, error);
    }
  }

  removeProductCard() {
    this.closest('marmeto-product-card').remove();
  }

  updateAllWishlistIcons() {
    document.querySelectorAll(`[value="${this.value}"]:not([id="${this.id}"])`).forEach(wishlistInput => {
      wishlistInput.checked = !wishlistInput.checked;
    })
  }

  debounce(func, delay) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }
}

customElements.define('marmeto-wishlist', MarmetoWishlist, { extends: 'input' });

if (localStorage.getItem('pendingWishlistOperations')) {
  MarmetoWishlist.handleBatchOperations(JSON.parse(localStorage.getItem('pendingWishlistOperations')))
}

class MarmetoDrawer extends HTMLDialogElement {
  constructor() {
      super();

      this.toggleClass = this.dataset.toggleClass?.split(' ');
      this.closeSelector = this.dataset.closeSelector;
  }

  connectedCallback() {
      this.closeButton = this.querySelector(this.closeSelector)

      this.closeButton.addEventListener('click', this.closeDialog.bind(this));

      // Close the dialog when clicking outside
      this.addEventListener('click', this.closeDialog.bind(this))
  }

  openDialog() {
      this.showModal();
      document.body.classList.add('overflow-hidden')
      this.toggleClass.forEach(selector => this.classList.remove(selector))
  }

  closeDialog() {
      if (event && event.target != this && event.target != this.closeButton) return;

      document.body.classList.remove('overflow-hidden')
      this.toggleClass.forEach(selector => this.classList.add(selector))

      // Close the dialog after the animation is completed
      setTimeout(() => {
          this.close();
      }, 300);
  }
}

customElements.define('marmeto-drawer', MarmetoDrawer, { extends: 'dialog' });

class LazySection extends HTMLElement {
  static sectionsToFetch = [];

  constructor() {
    super();

    this.section = this.closest('section')?.id || this.closest('[id]').id;
    this.section = this.section?.replace('shopify-section-', '');

    this.trigger = this.dataset.triggerEvent || 'intersection-observer';
    this.targetSelector = this.dataset.triggerTarget || 'body';

    this.boundHandleMouseover = this.handleMouseover.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    const targetElement = document.querySelector(this.targetSelector);

    // Different triggers based on data-trigger attribute
    if (this.trigger === 'mouseover') {
      if (screen.width < 990) return;
      
      targetElement.addEventListener('mouseover', this.boundHandleMouseover);
    } else if (this.trigger === 'click') {
      targetElement.addEventListener('click', this.boundHandleClick);
    } else {
      // Default to intersection observer
      new IntersectionObserver(this.handleIntersection.bind(this), { rootMargin: '0px 0px 200px 0px' }).observe(this);
    }
  }

  // Handler for intersection-observer trigger
  handleIntersection(entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.unobserve(this);

    this.fetchSections();
  }

  // Handler for mouseover trigger
  handleMouseover() {
    // Remove trigger once added to sectionsToFetch
    this.removeTrigger();
    this.fetchSections();
  }

  // Handler for click trigger
  handleClick() {
    // Remove trigger once added to sectionsToFetch
    this.removeTrigger();
    this.fetchSections();
  }

  // Common function for fetching sections
  fetchSections() {
    LazySection.sectionsToFetch.push(this.section);
    const sectionsToFetchBatch = LazySection.sectionsToFetch.length == 5 ? LazySection.sectionsToFetch.splice(0, 5) : LazySection.sectionsToFetch;

      // Check if there is an ongoing network request
    if (LazySection.abortController) {
      LazySection.abortController.abort();
    }

    LazySection.abortController = sectionsToFetchBatch.length < 5 && new AbortController();

    fetch(window.location.pathname + '?sections=' + sectionsToFetchBatch.join(','), LazySection.abortController.signal ? { signal: LazySection.abortController.signal } : {})
      .then((response) => response.json())
      .then((json) => {
        for (const [key, value] of Object.entries(json)) {
          const sectionContent = new DOMParser().parseFromString(value, 'text/html').getElementById('shopify-section-' + key);

          if (sectionContent && sectionContent.innerHTML.trim().length) {
            const section = document.getElementById('shopify-section-' + key);
            section.innerHTML = sectionContent.innerHTML;

              // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
            section.querySelectorAll('script').forEach((oldScriptTag) => {
              const newScriptTag = document.createElement('script');
              Array.from(oldScriptTag.attributes).forEach((attribute) => {
                newScriptTag.setAttribute(attribute.name, attribute.value);
              });
              newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
              oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
            });
            loadReviewsIoRatingSnippets();
          }
        }

        if (sectionsToFetchBatch.length < 5)
          LazySection.sectionsToFetch = [];
      })
      .catch((e) => {
        console.warn(e);
      });
  }

  // Remove trigger based on data-target attribute
  removeTrigger() {
    const targetElement = document.querySelector(this.targetSelector);

    if (targetElement) {
      targetElement.removeEventListener('mouseover', this.boundHandleMouseover);
      targetElement.removeEventListener('click', this.boundHandleClick);
    }
  }
}

customElements.define('lazy-section', LazySection);

class stickyAddToCartButton extends HTMLElement {
  constructor() {
    super();
    this.lastScrollY = window.scrollY;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.handleIntersection(entry);
      });
    });
    this.observer.observe(this);
    this.initialCheck();
  }
  handleIntersection(entry) {
    const stickyAddToCart = document.querySelector('.sticky-atc-button');
    const stickyAtcWrapper = document.getElementById('stickyAddToCart');
    const stickyAtcImg = document.querySelector('.sticky-atc-img');
    const currentScrollY = window.scrollY;
    if (!entry.isIntersecting && currentScrollY > this.lastScrollY) {
      stickyAddToCart.classList.add('sticky-atc');
      stickyAtcWrapper.classList.add('desktop-sticky-add-to-cart-button');
      stickyAtcImg.classList.remove("hidden");
    } else if (currentScrollY <= this.lastScrollY) {
      stickyAddToCart.classList.remove('sticky-atc');
      stickyAtcWrapper.classList.remove('desktop-sticky-add-to-cart-button');
      stickyAtcImg.classList.add("hidden");
    }
    this.lastScrollY = currentScrollY;
  }
  initialCheck() {
    const stickyAddToCart = document.querySelector('.sticky-atc-button');
    const stickyAtcWrapper = document.getElementById('stickyAddToCart');
    const stickyAtcImg = document.querySelector('.sticky-atc-img');
    const rect = this.getBoundingClientRect();
    if (rect.top < 0) {
      stickyAddToCart.classList.add('sticky-atc');
      stickyAtcWrapper.classList.add('desktop-sticky-add-to-cart-button');
      stickyAtcImg.classList.remove("hidden");
    } else {
      stickyAddToCart.classList.remove('sticky-atc');
      stickyAtcWrapper.classList.remove('desktop-sticky-add-to-cart-button');
      stickyAtcImg.classList.add("hidden");
    }
  }
  disconnectedCallback() {
    this.observer.disconnect();
  }
}
customElements.define('sticky-add-to-cart-button', stickyAddToCartButton);

class VideoAutoplay extends HTMLElement {
  constructor() {
    super();
    this.video = null;
    this.observer = null;
  }
  connectedCallback() {
    this.initializeVideo();
  }
  initializeVideo() {
    this.video = this.querySelector('.product-tab-video, .js-youtube');
    if (!this.video) return;
    this.initObserver();
  }
  initObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    };
    this.observer = new IntersectionObserver(this.handleVideoPlayPause.bind(this), observerOptions);
    this.observer.observe(this.video);
  }
  handleVideoPlayPause(entries) {
    entries.forEach(entry => {
      const videoElement = entry.target;
      if (entry.isIntersecting) {
        this.playVideo(videoElement);
      } else {
        this.pauseVideo(videoElement);
      }
    });
  }
  playVideo(videoElement) {
    if (videoElement.tagName === 'IFRAME') {
      videoElement.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    } else if (videoElement.tagName === 'VIDEO') {
      videoElement.play().catch(error => console.warn('Video play failed:', error));
    }
  }
  pauseVideo(videoElement) {
    if (videoElement.tagName === 'IFRAME') {
      videoElement.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } else if (videoElement.tagName === 'VIDEO') {
      videoElement.pause();
    }
  }
  disconnectedCallback() {
    if (this.observer && this.video) {
      this.observer.unobserve(this.video);
      this.observer.disconnect();
    }
  }
}
customElements.define('video-autoplay', VideoAutoplay);

class YoutubeBanner extends HTMLElement {
  connectedCallback() {
    const playButton = this.querySelector('.video-play-icon');
    const youtubeVideo = this.querySelector('.js-youtube');
    playButton?.addEventListener('click', function clickHandler() {
      youtubeVideo?.classList.toggle('show-banner-video');
      youtubeVideo?.classList.toggle('hide-banner-video');
      const youtubeVideoSrc = youtubeVideo?.src;
      if (!youtubeVideoSrc.includes('autoplay=1')) {
        youtubeVideo.src = youtubeVideoSrc + (youtubeVideoSrc.includes('?') ? '&' : '?') + 'autoplay=1';
      }
      playButton.removeEventListener('click', clickHandler);
    });
  }
}
customElements.define('youtube-banner', YoutubeBanner);

// code for sticky header search box
document.addEventListener('DOMContentLoaded', function () {
  const toggleButton = document.getElementById('header-search-sticky');
  const searchContainer = document.querySelector('.header__search');
  const closeButton = document.getElementById('close-search');
  if (toggleButton && searchContainer && closeButton) {
    toggleButton.addEventListener('click', function () {
      searchContainer.classList.add('is-visible');
      closeButton.classList.add('is-visible');
    });
    closeButton.addEventListener('click', function () {
      searchContainer.classList.remove('is-visible');
      closeButton.classList.remove('is-visible');
    });
  }
});

class CloseHeaderDrawer extends HTMLElement {
  constructor() {
    super();
    this.detailsElement = this.closest("details");
    this.addEventListener("click", this.closeHeaderDrawer.bind(this));
  }

  closeHeaderDrawer() {
    if (this.detailsElement.hasAttribute("open")) {
      this.detailsElement.removeAttribute("open");
      this.detailsElement.querySelector("summary").setAttribute("aria-expanded" , false)
      document.body.classList.remove(`overflow-hidden-${document.querySelector("header-drawer").dataset.breakpoint}`);
    }
  }
}
customElements.define('close-header-drawer', CloseHeaderDrawer);

class checkoutLoginToggle extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.querySelectorAll(".password-toggler").forEach((button) => {
      button.addEventListener("click", () => {
        var passwordInput = document.getElementById("password-field1");
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          document.querySelector(".show-password").setAttribute("hidden", "");
          document.querySelector(".hide-password").removeAttribute("hidden");
        } else {
          passwordInput.type = "password";
          document.querySelector(".show-password").removeAttribute("hidden");
          document.querySelector(".hide-password").setAttribute("hidden", "");
        }
      });
    });
  }
}
customElements.define('checkout-login', checkoutLoginToggle);

class BreadcrumbsReferrer extends HTMLElement {
  constructor() {
    super();
    this._init();
  }
  connectedCallback() {
    this._init();
  }
  _init() {
    document.addEventListener('DOMContentLoaded', () => {
      const referrerUrl = document.referrer;
      const currentPath = window.location.pathname;
      if (referrerUrl.includes('/collections/')) {
        const collectionHandle = new URL(referrerUrl).pathname.split('/collections/')[1]?.split('/')[0];
        sessionStorage.setItem('lastVisitedCollection', collectionHandle);
      }
      if (currentPath.includes('/products/') && !referrerUrl.includes('/collections/')) {
        sessionStorage.removeItem('lastVisitedCollection');
      }
      if (referrerUrl.includes('/search')) {
        const searchParams = new URL(referrerUrl).searchParams;
        const searchQuery = searchParams.get('q');
        sessionStorage.setItem('lastSearchQuery', searchQuery);
        sessionStorage.setItem('searchResultCount', searchParams.get('results_count') || '0');
      }
      if (currentPath.includes('/products/') && !referrerUrl.includes('/search')) {
        sessionStorage.removeItem('lastSearchQuery');
        sessionStorage.removeItem('searchResultCount');
      }
      if (currentPath.includes('/products/')) {
        const storedSearchQuery = sessionStorage.getItem('lastSearchQuery');
        const searchPlaceholdertext = document.getElementById('search-term-placeholder');
        searchPlaceholdertext.classList.add("empty-div");
        if (storedSearchQuery) {
          searchPlaceholdertext.classList.remove("empty-div");
          const searchPlaceholder = document.getElementById('search-term-placeholder');
          if (searchPlaceholder) {
            const searchResultCount = sessionStorage.getItem('searchResultCount') || '';
            searchPlaceholder.innerHTML = `
                <span class="tw-text-[#848484] md:tw-text-[#282828B2] tw-text-[10px] md:tw-text-[15px] tw-uppercase tw-font-primary tw-font-normal">
                    Search: ${storedSearchQuery}
                </span>`;
          }
        }
        const lastVisitedCollection = sessionStorage.getItem('lastVisitedCollection');
        const collectionPlaceholdertext = document.getElementById('collection-placeholder');
        collectionPlaceholdertext.classList.add("empty-div");
        if (lastVisitedCollection) {
          collectionPlaceholdertext.classList.remove("empty-div");
          const collectionPlaceholder = document.getElementById('collection-placeholder');
          if (collectionPlaceholder) {
            collectionPlaceholder.innerHTML = `
                <a href="/collections/${lastVisitedCollection}" class="tw-text-[#848484] md:tw-text-[#282828B2] tw-text-[10px] md:tw-text-[15px] tw-uppercase tw-font-primary tw-font-normal tw-no-underline hover:tw-underline focus:tw-underline">
                    ${lastVisitedCollection.replace(/-/g, ' ')}
                </a>`;
          }
        }
      }
    });
  }
}
customElements.define('breadcrumbs-referrer', BreadcrumbsReferrer);

class ScrollToSection extends HTMLElement {
  connectedCallback() {
    const button = this.querySelector(".scroll-button");
    if (button) {
      button.addEventListener("click", () => {
        const targetSectionId = this.getAttribute("target-id");
        const targetSection = document.getElementById(targetSectionId);
        if (targetSection) {
          const headerHeight = document.querySelector('header').offsetHeight;
          const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY;
          const announcementBar = document.querySelector('.custom-announcement-bar');
          const AnnouncementPosition = announcementBar ? announcementBar.offsetHeight : 0;
          const PDPAnnouncementBars = document.querySelectorAll('.pdp-announcement-bar');
          const PDPAnnouncementPosition = [...PDPAnnouncementBars].reduce((total, bar) => total + bar.offsetHeight, 0);
          window.scrollTo({
            top: targetPosition - headerHeight - AnnouncementPosition - PDPAnnouncementPosition,
            behavior: 'smooth'
          });
        }
      });
    }
  }
}
customElements.define("scroll-to-section", ScrollToSection);

class CustomPopup extends HTMLElement {
  constructor() {
    super();
    this.popup = null;
    this.closeBtn = null;
  }
  connectedCallback() {
    this.init();
  }
  init() {
    this.popup = this.querySelector('#custom-popup');
    this.closeBtn = this.querySelector('#close-custom-popup');
    const button = this.querySelector('#open-custom-popup');

    if (button) button.addEventListener('click', (e) => this.openPopup(e));
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closePopup());
    if (this.popup) this.popup.addEventListener('click', (e) => this.closeOnOutsideClick(e));
  }
  openPopup(e) {
    e.preventDefault();
    if (this.popup) {
      this.popup.classList.remove('tw-hidden');
      document.body.classList.add("overflow-hidden");
    }
  }
  closePopup() {
    if (this.popup) {
      this.popup.classList.add('tw-hidden');
      document.body.classList.remove("overflow-hidden");
    }
  }
  closeOnOutsideClick(e) {
    if (e.target === this.popup) {
      this.closePopup();
    }
  }
}
customElements.define('custom-popup', CustomPopup);