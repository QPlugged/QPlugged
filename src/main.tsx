import App from "./App";
import ReactDOM from "react-dom/client";

export const isProduction = import.meta.env.PROD;

// if (isProduction)
//     window.addEventListener("contextmenu", (event) => event.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App />,
);
