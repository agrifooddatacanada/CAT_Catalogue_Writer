import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import store from "./store/store";
import App from "./App";

test("renders Catalogue Writer home page with schema selector and upload dropzone", () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );

  expect(screen.getByText(/Describe your work/i)).toBeInTheDocument();
  expect(screen.getByText(/Quick Links/i)).toBeInTheDocument();
  expect(
    screen.getByText(/Upload a previous Catalogue Record/i)
  ).toBeInTheDocument();
});
