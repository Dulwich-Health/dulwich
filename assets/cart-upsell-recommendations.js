console.log('defining CartUpsellRecommendations')
class CartUpsellRecommendations extends Carousel {
    constructor() {
      super();
  
      // Initialize properties with default values if no values are provided in the dataset
      this.productIds = JSON.parse(this.dataset.productIds) || [];
      this.intent = this.dataset.intent;
      this.limit = this.dataset.limit || 4;
    }
  
    // When the element is added to the DOM, fetch recommendations for each product ID
    connectedCallback() {
      if (!this.intent) return;

      const handleIntersection = async (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);

        try {
          // Create URLs for fetching recommendations for each product ID
          const urls = this.productIds.map(id => `/recommendations/products?product_id=${id}&limit=${this.limit}&intent=${this.intent}&section_id=upsell-recommendations`);
          
          // Fetch recommendations for each URL in parallel
          const responses = await Promise.all(urls.map(url => fetch(url)));
    
          // For each response, extract the HTML for the recommendations and add them to the element
          for (let response of responses) {
            // Extract HTML from response
            const text = await response.text();
            const html = document.createElement('div');
            html.innerHTML = text;
    
            // Get all the upsell card elements from the HTML
            const recommendations = html.querySelectorAll('[data-upsell-card]');
    
            // Only add as many recommendations as needed to reach the limit
            if (this.querySelectorAll('[data-upsell-card]').length < this.limit) {
              const numRecommendationsToAdd = Math.min(this.limit - this.querySelectorAll('[data-upsell-card]').length, recommendations.length);
              const fragment = document.createDocumentFragment();
              for (let i = 0; i < numRecommendationsToAdd; i++) {
                fragment.appendChild(recommendations[i]);
              }
              
              this.querySelector('.splide__list').appendChild(fragment);
              loadReviewsIoRatingSnippets();
            }
          }
          
          if (this.querySelectorAll('[data-upsell-card]').length) {
            // Adding tailwind classes only when upsell product cards are present
            this.classList.add('tw-py-5', 'tw-mb-16', 'tw-border-t', 'tw-border-solid', 'tw-border-gray-300');
            this.querySelector('h3')?.classList.remove('hidden')
            this.refreshSlider();
          }
        } catch (error) {
          console.error(error);
        }
      }

      new IntersectionObserver(handleIntersection.bind(this)).observe(this);
    }
  }
  
  customElements.define('cart-upsell-recommendations', CartUpsellRecommendations);