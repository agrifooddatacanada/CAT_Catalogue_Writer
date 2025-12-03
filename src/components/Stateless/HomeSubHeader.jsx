import React from "react";
import theme from "../../theme";

function HomeSubHeader({ content_heading, content }) {

  return (
    <div
      className="Sub-header"
      style={{
        textAlign: "center",
        backgroundColor: theme.primaryColor,
        padding: "15px 30px",
        color: "white",
      }}
    >
      <h1>{content_heading}</h1>
      <p style={{ fontSize: "1.25rem" }}>
        {content}
      </p>
    </div>
  )
}

export default HomeSubHeader;