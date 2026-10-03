import React from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";

export default function LandinghPage() {
  const router = useNavigate();
  const backgroundImage = `url(${process.env.PUBLIC_URL}/background.png)`;

  return (
    <div className="landingPageContainer" style={{ backgroundImage }}>
      <nav>
        <div className="navHeader">
          <h2>Let's CatchUp</h2>
        </div>
        <div className="navList">
          <p
            onClick={() => {
              router("/Joined-As-Guest");
            }}
          >
            Join as Guest
          </p>
          <p
            onClick={() => {
              router("/auth");
            }}
          >
            Register
          </p>

          {/* <button>Login</button> */}
          <div
            onClick={() => {
              router("/auth");
            }}
            role="button"
          >
            <p>Login</p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your loved
            Ones
          </h1>
          <p>Cover a distance by Let's CatchUp</p>

          <div role="button">
            <Link to={"/auth"}>Get Started</Link>
          </div>
        </div>
        <div>
          <img src="/mobile.png" alt="" />
        </div>
      </div>
    </div>
  );
}
