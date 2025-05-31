import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../utils/socket';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const ClassroomPage = () => {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role || '');
  const [classrooms, setClassrooms] = useState([]);
  const [classroomName, setClassroomName] = useState('');
  const [classroomCode, setClassroomCode] = useState('');
  const [joinClassroomCode, setJoinClassroomCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setRole(user?.role || '');
  }, [user]);

  useEffect(() => {
    if (role) fetchClassrooms();
  }, [role]);

  const fetchClassrooms = async () => {
    try {
      const endpoint = role === 'teacher' ? '/api/classroom' : '/api/classroom/student';
      const res = await axios.get(endpoint);
      setClassrooms(res.data);
    } catch (err) {
      console.error('Error fetching classrooms', err);
    }
  };

  const handleCreateClassroom = async () => {
    if (!classroomName.trim() || !classroomCode.trim()) {
      // alert('Please enter both name and code.');
      toast.error('Please enter both Name and Code!');
      return;
    }

    try {
      const res = await axios.post('/api/classroom/create', {
        name: classroomName,
        code: classroomCode,
      });
      // alert('Classroom created!');
      toast.success('Classroom Created!');
      setClassroomName('');
      setClassroomCode('');
      fetchClassrooms();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating classroom');
    }
  };

  const handleJoinClassroom = async () => {
    if (!joinClassroomCode.trim()) {
      // alert('Enter a classroom code');
      toast.error("Enter a classroom code!");
      return;
    }

    try {
      const res = await axios.post('/api/classroom/join', { code: joinClassroomCode });
      // alert('Joined classroom!');
      toast.success('Joined classroom!');
      setJoinClassroomCode('');
      fetchClassrooms();
    } catch (err) {
      alert(err.response?.data?.error || 'Error joining classroom');
    }
  };

  const handleCardClick = (id) => {
    navigate(`/classroom/${id}`);
    toast.success('Entered classroom!');
  };

  useEffect(() => {
    socket.on('classroom_update', updated => {
      setClassrooms(prev =>
        prev.map(c => (c._id === updated._id ? updated : c))
      );
    });

    socket.on('notification', (note) => {
      if (['classroom_update', 'classroom_removal', 'classroom_deletion'].includes(note.type)) {
        fetchClassrooms();
      }
    });

    return () => {
      socket.off('classroom_update');
      socket.off('notification');
    };
  }, []);

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">Classroom Dashboard</h1>

        {role === 'teacher' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Classroom Name"
              className="input input-bordered w-full"
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Classroom Code"
              className="input input-bordered w-full"
              value={classroomCode}
              onChange={(e) => setClassroomCode(e.target.value)}
            />
            <button className="btn btn-success w-full" onClick={handleCreateClassroom}>
              Create Classroom
            </button>
          </div>
        )}

        {role === 'student' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Classroom Code"
              className="input input-bordered w-full"
              value={joinClassroomCode}
              onChange={(e) => setJoinClassroomCode(e.target.value)}
            />
            <button className="btn btn-accent w-full" onClick={handleJoinClassroom}>
              Join Classroom
            </button>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mt-6">Classrooms</h2>
          <div className="grid gap-4 md:grid-cols-2 mt-2">
            {classrooms.map(c => (
              <div
                key={c._id}
                className="card bg-base-200 shadow hover:shadow-lg cursor-pointer transition"
                onClick={() => handleCardClick(c._id)}
              >
                <div className="card-body">
                  <h3 className="card-title">{c.name}</h3>
                  <p>Code: {c.code}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClassroomPage;