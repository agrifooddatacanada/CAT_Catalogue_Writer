import React from "react";
import theme from "../../theme";

function HomeSubHeader({ content_heading, content }) {
  return (
    <div
      className="Sub-header"
      style={{
        textAlign: "center",
        backgroundColor: theme.primaryColor,
        padding: "18px 30px 26px",
        color: theme.primaryContrastText,
        textShadow: "0 1px 2px rgba(0, 0, 0, 0.12)",
      }}
    >
      <h1 style={{ margin: "0 0 8px", fontWeight: 700 }}>{content_heading}</h1>
      <p style={{ fontSize: "1.2rem", margin: 0, color: "rgba(255, 255, 255, 0.94)" }}>
        {content}
      </p>
    </div>
  );
}

export default HomeSubHeader;
