import hannahStudentImageUrl from "../../assets/SETU/Hannah_Student_Image.svg?url";
import setuWordmarkUrl from "../../assets/SETU/SETU - Wordmark.svg?url";
import faqBannerStudentTabletUrl from "../../assets/SETU/FAQ-Photo-Student Looking at a Tablet.png?url";
import coursesBannerWomenTalkingUrl from "../../assets/SETU/FAQ-Photo-Two Women Talking.png?url";

const EVENT_ROWS = [
  { title: "Virtual Campus Tour", date: "12th June 2026" },
  { title: "International Applicants Webinar", date: "26th June 2026" },
  { title: "Open Day", date: "2nd August 2026" },
];

const FAQ_ROWS = [
  "How do I reset my portal password?",
  "Where can I view my timetable?",
  "How do I access exam results?",
  "Who do I contact for support?",
];

const COURSE_ROWS = [
  "Bachelor of Science in Computer Science",
  "Bachelor of Engineering (Honours)",
  "Bachelor of Business (Honours)",
  "Bachelor of Science in Applied Computing",
];

const IMPORTANT_DATES = [
  { label: "Applications Open", value: "1st October 2026" },
  { label: "Priority application deadline", value: "31 January 2027" },
  { label: "Final application deadline", value: "31 March 2027" },
  { label: "Offer notifications begin", value: "April 2027" },
  { label: "Course start date", value: "September 2027" },
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
        <h1>Hi Hannah, welcome to your SETU student portal</h1>
        <p className="logged-in">Logged in as hannah.student@setu.ie</p>
      </div>

      <div className="body-grid">
        <div>
          <section
            className="hero hero--setu"
            aria-labelledby="hero-banner-title"
          >
            <div className="hero-inner hero-inner--setu-banner">
              <div className="hero-setu-profile">
                <div className="hero-setu-profile__frame">
                  <img
                    className="hero-setu-profile__img"
                    src={hannahStudentImageUrl}
                    alt=""
                    width={104}
                    height={104}
                  />
                </div>
              </div>
              <div className="hero-setu-copy">
                <h2 id="hero-banner-title" className="hero-setu-greeting">
                  Hi Hannah,
                </h2>
                <p className="hero-setu-program">
                  Business in Supply Chain Management
                </p>
                <p className="hero-setu-id">Student ID: CA2070981</p>
              </div>
              <div className="hero-setu-spacer" aria-hidden="true" />
              <div className="hero-setu-brand">
                <img
                  className="hero-setu-wordmark"
                  src={setuWordmarkUrl}
                  alt="SETU"
                  width={140}
                  height={156}
                />
              </div>
            </div>
          </section>

          <section className="setu-dash" aria-label="Dashboard">
            <div className="setu-dash-grid">
              <div className="setu-dash-grid__cells">
                <article className="setu-dash-card setu-dash-card--stack">
                  <header className="setu-dash-card__head">
                    <span
                      className="setu-dash-icon setu-dash-icon--green"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">
                        event_available
                      </span>
                    </span>
                    <h2 className="setu-dash-card__title">Events</h2>
                  </header>

                  <ul className="setu-dash-table" aria-label="Upcoming events">
                    {EVENT_ROWS.map((row) => (
                      <li key={row.title} className="setu-dash-table__row">
                        <span className="setu-dash-table__cell setu-dash-table__cell--title">
                          {row.title}
                        </span>
                        <span className="setu-dash-table__cell setu-dash-table__cell--date">
                          {row.date}
                        </span>
                        <span className="setu-dash-table__cell setu-dash-table__cell--action">
                          <a className="setu-dash-link" href="#">
                            View detail
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="setu-dash-card__footer">
                    <a className="setu-dash-btn" href="#">
                      More events
                    </a>
                  </div>
                </article>

                <article className="setu-dash-card setu-dash-card--stack">
                  <header className="setu-dash-card__head">
                    <span
                      className="setu-dash-icon setu-dash-icon--green"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">
                        assignment_ind
                      </span>
                    </span>
                    <h2 className="setu-dash-card__title">Your Application</h2>
                  </header>

                  <div className="setu-dash-app-block">
                    <span
                      className="setu-dash-app-block__icon"
                      aria-hidden="true"
                    >
                      <span className="material-symbols-outlined">school</span>
                    </span>
                    <div className="setu-dash-app-block__text">
                      <p className="setu-dash-app-block__code">
                        2026-2027 SE41C
                      </p>
                      <p className="setu-dash-app-block__course">
                        Higher Diploma in Business in Supply Chain Management
                      </p>
                    </div>
                  </div>

                  <div className="setu-dash-status">
                    <span className="setu-dash-status__dot" aria-hidden="true" />
                    <div className="setu-dash-status__copy">
                      <p className="setu-dash-status__title">
                        We are reviewing your application
                      </p>
                      <p className="setu-dash-status__meta">
                        Offer date to be given by August 2026
                      </p>
                    </div>
                  </div>

                  <div className="setu-dash-card__footer">
                    <a className="setu-dash-btn" href="#">
                      View application
                    </a>
                  </div>
                </article>

                <article className="setu-dash-card setu-dash-card--banner-bottom">
                  <div
                    className="setu-dash-card__banner setu-dash-card__banner--courses"
                  >
                    <h2 className="setu-dash-card__banner-title">Courses</h2>
                    <div className="setu-dash-card__banner-art">
                      <img
                        className="setu-dash-card__banner-photo"
                        src={coursesBannerWomenTalkingUrl}
                        alt=""
                        width={584}
                        height={246}
                      />
                    </div>
                  </div>
                  <ul className="setu-dash-list">
                    {COURSE_ROWS.map((label) => (
                      <li key={label} className="setu-dash-list__row">
                        <span className="setu-dash-list__label">{label}</span>
                        <a className="setu-dash-link" href="#">
                          View detail
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="setu-dash-card setu-dash-card--banner-bottom">
                  <div className="setu-dash-card__banner setu-dash-card__banner--faq">
                    <h2 className="setu-dash-card__banner-title">FAQ</h2>
                    <div className="setu-dash-card__banner-art">
                      <img
                        className="setu-dash-card__banner-photo"
                        src={faqBannerStudentTabletUrl}
                        alt=""
                        width={530}
                        height={246}
                      />
                    </div>
                  </div>
                  <ul className="setu-dash-list">
                    {FAQ_ROWS.map((label) => (
                      <li key={label} className="setu-dash-list__row">
                        <span className="setu-dash-list__label">{label}</span>
                        <a className="setu-dash-link" href="#">
                          View detail
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <article
                className="setu-dash-card setu-dash-card--important-dates"
                aria-labelledby="important-dates-title"
              >
                <header className="setu-dash-card__head">
                  <span
                    className="setu-dash-icon setu-dash-icon--alert"
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">error</span>
                  </span>
                  <h2 className="setu-dash-card__title" id="important-dates-title">
                    Important Dates
                  </h2>
                </header>

                <dl className="setu-dash-dates">
                  {IMPORTANT_DATES.map((row) => (
                    <div key={row.label} className="setu-dash-dates__block">
                      <dt className="setu-dash-dates__label">{row.label}</dt>
                      <dd className="setu-dash-dates__value">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="setu-dash-card__footer setu-dash-card__footer--start">
                  <a className="setu-dash-btn" href="#">
                    Open calendar
                  </a>
                </div>
              </article>
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
              For queries about applications, documents, or eligibility, our
              team is here to assist.
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
