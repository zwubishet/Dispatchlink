import {apiCall} from "../services/api.js";

export async function get_available_drivers() {
    const data = await apiCall("GET", "/api/drivers");
    const available = data.filter(d=>d.is_available == true);
    // const drivers = data.map(driver =>{
    //         `#vehicle_plate: ${driver.vehicle_plate} | name: ${driver.user.name} | vehicle_type: ${driver.vehicle_type} | phone: ${driver.user.phone}`
    // })
    if (available.length === 0) return 'No drivers available right now.';
    return available.map(a=>`Vehicle_plate: ${a.vehicle_plate} | name: ${a.user.name} | vehicle_type: ${a.vehicle_type} | phone: ${a.user.phone}`).join('\n');
}

