import { useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCalendar } from "../store/slices/calendarSlice";


function useGetCalendar() {

    const dispatch = useDispatch();

    const url = "/cal/calendars.json"

    useEffect(() => {
        axios.get(url)
            .then(res => dispatch(setCalendar(res.data.calendars)))
    }, [])

}

export default useGetCalendar;