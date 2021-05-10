import axios from 'ajax/axios';
import { USER } from 'ajax/endpoints';

async function getUpdatedUser() {
  const { data } = await axios.get(USER);
  return data;
}
export default getUpdatedUser;
