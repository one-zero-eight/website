import Calendar from "./Calendar";
import Sidebar from "./Sidebar";

function App() {
  return (
    <div className="flex flex-row h-full w-full font-primary1">
      <Sidebar />
      <Calendar />
    </div>
  );
}

export default App;
