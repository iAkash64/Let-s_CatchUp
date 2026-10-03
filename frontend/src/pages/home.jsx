import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { Button, IconButton, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import { AuthContext } from "../contexts/AuthContext";

function HomeComponent() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const { addToUserHistory } = useContext(AuthContext);
  const handleJoinVideoCall = async (event) => {
    event.preventDefault();

    const cleanedMeetingCode = meetingCode.trim();
    if (!cleanedMeetingCode) return;

    try {
      await addToUserHistory(cleanedMeetingCode);
    } catch (error) {
      // A failed history request should not prevent a user joining their meeting.
      console.error("Could not save meeting history:", error);
    }

    navigate(`/${cleanedMeetingCode}`);
  };

  return (
    <div className="homePage">
      <div className="navBar">
        <div>
          <h2>Let's CatchUp</h2>
        </div>

        <div className="navActions">
          <IconButton
            aria-label="View meeting history"
            onClick={() => navigate("/history")}
          >
            <RestoreIcon />
          </IconButton>
          <Button onClick={() => navigate("/history")}>History</Button>

          <Button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      <main className="meetContainer">
        <div className="leftPanel">
          <div className="meetingCard">
            <h2>Providing Quality Video Call, Just Like Quality Education</h2>

            <form className="meetingForm" onSubmit={handleJoinVideoCall}>
              <TextField
                className="meetingField"
                onChange={(e) => setMeetingCode(e.target.value)}
                value={meetingCode}
                id="outlined-basic"
                label="Meeting Code"
                variant="outlined"
                required
              />
              <Button type="submit" variant="contained">
                Join
              </Button>
            </form>
          </div>
        </div>
        <div className="rightPanel">
          <img srcSet="/logo3.png" alt="" />
        </div>
      </main>
    </div>
  );
}

export default withAuth(HomeComponent);
