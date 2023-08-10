import App from "./App";
import ReactDOM from "react-dom/client";

window.addEventListener("contextmenu", (event) => event.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App />,
);
