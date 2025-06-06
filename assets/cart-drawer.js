class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    const cartHeaderPrice = document.querySelector('#header-cart-price');
    const drawerInner = this.querySelector('.drawer__inner');
    let closeTimeout;
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    const handleDesktopClick = (e) => {
      e.preventDefault();
      window.location.href = '/cart';
    };
    const enableDesktopBehavior = () => {
      cartLink.addEventListener('mouseover', handleMouseOver);
      cartLink.addEventListener('mouseleave', handleMouseLeave);
      drawerInner.addEventListener('mouseover', handleMouseOver);
      drawerInner.addEventListener('mouseleave', handleMouseLeave);
      cartLink.addEventListener('click', handleDesktopClick);
    };
    const handleMouseOver = () => {
      clearTimeout(closeTimeout);
      this.open(cartLink);
    };
    const handleMouseLeave = () => {
      closeTimeout = setTimeout(() => {
        this.close();
      }, 200);
    };
    const handleMobileClick = (event) => {
      event.preventDefault();
      if (this.classList.contains('active')) {
        this.close();
      } else {
        this.open(cartLink);
      }
    };
    const enableMobileBehavior = () => {
      cartLink.removeEventListener('mouseover', handleMouseOver);
      cartLink.removeEventListener('mouseleave', handleMouseLeave);
      drawerInner.removeEventListener('mouseover', handleMouseOver);
      drawerInner.removeEventListener('mouseleave', handleMouseLeave);
      cartLink.removeEventListener('click', handleDesktopClick);
      cartLink.addEventListener('click', handleMobileClick);
      this.addEventListener('click', (event) => {
        const isInsideDrawer = drawerInner.contains(event.target) || cartLink.contains(event.target);
        if (!isInsideDrawer) {
          this.close();
        }
      });
    };
    const applyResponsiveBehavior = () => {
      const isMobile = window.innerWidth <= 749;
      if (isMobile) {
        enableMobileBehavior(); 
      } else {
        enableDesktopBehavior();
      }
    };
    applyResponsiveBehavior();
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
    cartHeaderPrice.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = '/cart';
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id || parsedState.items[0].id; //Or condition for frequently bought together products 
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);


const targetNode = document.querySelector('cart-drawer');
const observer = new MutationObserver((mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      let cartTotalPrice = document.querySelector(".cart-total-price");
      if(cartTotalPrice)
      {
        document.getElementById("cart-header-price").innerHTML = "/" + cartTotalPrice.innerHTML;
      }
      else {
        document.getElementById("cart-header-price").innerHTML = "/£0.00";
      }
    }
  }
});
const config = { childList: true, attributes: true, subtree: true };
observer.observe(targetNode, config);