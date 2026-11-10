import Link from "next/link";
import { Shell } from "./login/shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="panel">
        <div className="head">
          <h2>Esta página no existe</h2>
          <p>La dirección puede estar mal escrita o la página ya no está disponible.</p>
        </div>
        <Link className="btn" href="/">Volver al inicio</Link>
      </div>
    </Shell>
  );
}
