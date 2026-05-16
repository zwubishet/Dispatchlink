import {apiCall} from "../services/api.js";

export async function get_available_drivers() {
    const data = await apiCall("GET", "/api/drivers");
    const available = data.filter(d=>d.is_available == true);
    // const drivers = data.map(driver =>{
    //         `#vehicle_plate: ${driver.vehicle_plate} | name: ${driver.user.name} | vehicle_type: ${driver.vehicle_type} | phone: ${driver.user.phone}`
    // })
    if (available.length === 0) return 'No drivers available right now.';
    return available
    .map(d =>
        `${d.user.name} (driver_id: ${d.id}) | ${d.user.phone} | plate: ${d.vehicle_plate}`
    )
    .join('\n');
}

