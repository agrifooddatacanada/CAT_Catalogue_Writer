import React from "react";
import theme from "../../theme";

function HomeQuickStart({
    quick_start_heading,
    step_1,
    watch_tutorial_video,
    or,
    read_the_tutorial,
    instead,
    step_2,
    step_3,
    step_4
}) {

  return (
    <div
      className="Quick-Start_Content"
      style={{
        textAlign: "left",
        backgroundColor: theme.secondaryColor,
        padding: "80px 80px",
        color: "black",
      }}
    >
      <h3 style={{ marginBottom: "0px" }}>{quick_start_heading}</h3>
      <p style={{ fontSize: "1rem", fontWeight: "500", marginTop: "0px" }}>
        {step_1}
        <a
          href="https://agrifooddatacanada.ca/"
          target="_blank"
          rel="noreferrer"
          style={{
            color: theme.primaryColor,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            textDecorationColor: theme.underlineColor,
            cursor: "pointer",
            "&:hover": {
              textDecorationColor: theme.primaryColor,
            },
          }}
        >
          {watch_tutorial_video}
        </a>
        {or}
        <a
          href="https://agrifooddatacanada.ca/"
          target="_blank"
          rel="noreferrer"
          style={{
            color: theme.primaryColor,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            textDecorationColor: theme.underlineColor,
            cursor: "pointer",
            "&:hover": {
              textDecorationColor: theme.primaryColor,
            },
          }}
        >
          {read_the_tutorial}
        </a>
        {instead}
        <br />
        {step_2}
        <br />
        {step_3}
        <br />
        {step_4}
      </p>
    </div>
  )
}

export default HomeQuickStart;