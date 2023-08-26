import App from "./App";
import "./styles.css";
import ReactDOM from "react-dom/client";

export const isProduction = import.meta.env.PROD || false;
export const isDevelopment = import.meta.env.DEV || false;

window.addEventListener("contextmenu", (event) => event.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App />,
);
