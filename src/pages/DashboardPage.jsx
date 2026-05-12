const PRODUCT_CARDS = [
  {
    icon: "/assets/Flag_Icon.svg",
    badge: "Good Fit",
    badgeClass: "badge badge--fit",
    title: "Ukraine Credit Guarantee Scheme",
    description:
      "Support for businesses impacted by exceptional circumstances, with government-backed guarantees.",
    cta: "Apply Now",
  },
  {
    icon: "/assets/Growth_Icon.svg",
    badge: "Good Fit",
    badgeClass: "badge badge--fit",
    title: "Growth & Sustainability Loan Scheme",
    description:
      "Long-term investment loans for energy efficiency, sustainable practices, and competitive growth.",
    cta: "Apply Now",
  },
  {
    icon: "/assets/Piggybank_icon.svg",
    badge: "Not Suitable",
    badgeClass: "badge badge--not",
    title: "COVID-19 Credit Guarantee Scheme",
    description:
      "Legacy scheme for pandemic-related working capital; eligibility windows may no longer apply to your profile.",
    cta: "Product info",
  },
  {
    icon: "/assets/Graph_Icon.svg",
    badge: "Good Fit",
    badgeClass: "badge badge--fit",
    title: "Future Growth Loan Scheme",
    description:
      "Term finance for strategic capital expenditure and expansion plans that meet scheme criteria.",
    cta: "Apply Now",
  },
  {
    icon: "/assets/Tractor_Icon.svg",
    badge: "Not Suitable",
    badgeClass: "badge badge--not",
    title: "Agri Cashflow Support Loan",
    description:
      "Targeted at primary agriculture producers; your application profile indicates this may not be the best match.",
    cta: "Product info",
  },
  {
    icon: "/assets/Solar_Icon.svg",
    badge: "Good Fit",
    badgeClass: "badge badge--fit",
    title: "Energy Efficiency Loan Scheme",
    description:
      "Funding for upgrades that reduce energy use and emissions, aligned with national climate targets.",
    cta: "Apply Now",
  },
];

function ArrowLink({ children }) {
  return (
    <span className="link-arrow">
      {children}{" "}
      <img
        src="/assets/Arrow Icon.svg"
        alt=""
        width="16"
        height="12"
        aria-hidden="true"
      />
    </span>
  );
}

export function DashboardPage() {
  return (
    <>
      <div className="welcome-row">
        <h1>Hi Test 2, welcome to the SBCI Hub</h1>
        <p className="logged-in">Logged in as Catherine.Hogan@SME.ie</p>
      </div>

      <div className="body-grid">
        <div>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-inner">
              <h2 id="hero-title">Growth &amp; Sustainability Loan Scheme</h2>
              <p>
                Access low-cost finance to invest in your business with favourable
                terms designed to support growth and sustainability.
              </p>
              <button type="button" className="btn-hero">
                Apply now
                <svg
                  width="16"
                  height="12"
                  viewBox="0 0 16 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M10 12L8.6 10.55L12.15 7H0V5H12.15L8.6 1.45L10 0L16 6L10 12Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </section>

          <section className="products" aria-labelledby="products-title">
            <div className="products-head">
              <h2 id="products-title">Our Products</h2>
              <p className="sub">
                Apply for schemes on behalf of Murphy &amp; Sons LTD from the
                options below.
              </p>
            </div>

            <div className="cards-grid">
              {PRODUCT_CARDS.map((card) => (
                <article key={card.title} className="card">
                  <div className="card-top">
                    <div className="card-icon" aria-hidden="true">
                      <img src={card.icon} alt="" width="22" height="22" />
                    </div>
                    <span className={card.badgeClass}>{card.badge}</span>
                  </div>
                  <h3>{card.title}</h3>
                  <p className="desc">{card.description}</p>
                  <a className="card-cta" href="#">
                    <ArrowLink>{card.cta}</ArrowLink>
                  </a>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="info-panel" aria-label="Help and guidance">
          <div className="info-box">
            <h3>Not Suitable for SBCI Products?</h3>
            <p>
              If our schemes are not a match for your needs, you may still find
              answers or alternative routes in our FAQs.
            </p>
            <a className="link-arrow" href="#">
              <ArrowLink>View related FAQs</ArrowLink>
            </a>
          </div>

          <div className="info-box">
            <h3>Not Sure Which Scheme Suits You?</h3>
            <p>
              Answer a few short questions and we will highlight programmes that
              may fit your business situation.
            </p>
            <a className="link-arrow" href="#">
              <ArrowLink>Take the test</ArrowLink>
            </a>
          </div>

          <div className="info-box">
            <h3>Need some help?</h3>
            <p>
              For queries about applications, documents, or eligibility, our team
              is here to assist.
            </p>
            <div className="contact-inset">
              <div className="label">Contact our support team</div>
              <div className="phone-row">
                <span
                  className="material-symbols-outlined phone-row__icon"
                  aria-hidden="true"
                >
                  call
                </span>
                <span>1800 123 456</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
