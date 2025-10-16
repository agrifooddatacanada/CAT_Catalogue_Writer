import * as React from "react";

function Footer({ powered_by, supported_by }) {
  return (
    <div className="Footer">
      <hr
        style={{
          maxWidth: "100%",
          borderTop: "1px rgba(220, 220, 220, 1) solid",
          marginTop: "20px",
          marginBottom: "3px",
        }}
      />
      <div className="Footer_Organizations" style={{ padding: "32px" }}>
        <p style={{ margin: "0px" }}>{powered_by}</p>
        <a
          href="https://agrifooddatacanada.ca/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/assets/images/agri-logo.png"
            alt="Agri-Food Data Canada at UoG Logo"
            style={{ width: "200px", marginBottom: "15px" }}
          />
        </a>
        <p style={{ margin: "0px" }}>{supported_by}</p>
        <a
          href="https://www.cfref-apogee.gc.ca/home-accueil-eng.aspx"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="/assets/images/research-excellent-fund.png"
            alt="Canada First Research Excellence Fund Logo"
            style={{ height: "120px" }}
          />
        </a>
      </div>
    </div>
  );
}

export default Footer;