import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import CreateBazaar from '../components/CreateBazaar';
import AddItem from '../components/AddItem';

// The bazzar will show in the bazaar link layer
const Bazaar = () => {
  const { id: classroomId } = useParams();
  const [bazaars, setBazaars] = useState([]);

  // fetching the bazaars based on the classrom the user is joined
  useEffect(() => {
    const fetchBazaars = async () => {
      try {
        const response = await axios.get(`/api/bazaar?classroomId=${classroomId}`);
        setBazaars(response.data);
      } catch (err) {
        console.error('Failed to fetch bazaars', err);
      }
    };
    fetchBazaars();
  }, [classroomId]);

  return (
    // Updated the css style with tailwindcss
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Bazaar</h1>
      <CreateBazaar classroomId={classroomId} />
      {bazaars.map((bazaar) => (
        <div key={bazaar._id} className="border rounded p-4 shadow">
          <h2 className="text-xl font-semibold">{bazaar.name}</h2>
          <p className="text-gray-600">{bazaar.description}</p>
          <AddItem bazaarId={bazaar._id} />
        </div>
      ))}
    </div>
  );
};

export default Bazaar;