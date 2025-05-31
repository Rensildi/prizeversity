import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import socket from '../utils/socket';

const Groups = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // these const state variables will be managing groups and group sets (not yet have been put to implementation yet)
  const [groupSets, setGroupSets] = useState([]);
  const [groupSetName, setGroupSetName] = useState('');
  const [groupSetSelfSignup, setGroupSetSelfSignup] = useState(false);
  const [groupSetJoinApproval, setGroupSetJoinApproval] = useState(false);
  const [groupSetMaxMembers, setGroupSetMaxMembers] = useState('');
  const [groupSetImage, setGroupSetImage] = useState('');
  const [editingGroupSet, setEditingGroupSet] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [groupMaxMembers, setGroupMaxMembers] = useState('');
  const [groupCount, setGroupCount] = useState(1);
  const [selectedMembers, setSelectedMembers] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [memberFilters, setMemberFilters] = useState({});
  const [memberSorts, setMemberSorts] = useState({});
  const [memberSearches, setMemberSearches] = useState({});


  // Moved all the functions from the Classroom.jsx related to the group functionalities

  // Will get the group sets and join the socket room for the classroom 
  useEffect(() => {
    fetchGroupSets();
    socket.emit('join', `classroom-${id}`);
    return () => {
      socket.off('group_update');
      socket.off('groupset_update');
    };
  }, [id]);


  // Will fetch group sets for the classroom 
  const fetchGroupSets = async () => {
    try {
      const res = await axios.get(`/api/group/groupset/classroom/${id}`);
      setGroupSets(res.data);
    } catch (err) {
      console.error('Failed to fetch group sets:', err);
    }
  };

  // Teacher will be the only one that will be able to crate Group Set
  const handleCreateGroupSet = async () => {
    try {
      await axios.post('/api/group/groupset/create', {
        name: groupSetName,
        classroomId: id,
        selfSignup: groupSetSelfSignup,
        joinApproval: groupSetJoinApproval,
        maxMembers: groupSetMaxMembers,
        image: groupSetImage,
      });
      // Will refresh the list and reset the inputs from the previous creation
      fetchGroupSets();
      setGroupSetName('');
      setGroupSetSelfSignup(false);
      setGroupSetJoinApproval(false);
      setGroupSetMaxMembers('');
      setGroupSetImage('');
    } catch (err) {
      alert('Failed to create GroupSet');
    }
  };

  // The groups will be crated within the groupset that is specfici choosen
  const handleCreateGroup = async (groupSetId) => {
    if (!groupName.trim()) return alert('Group name required');
    try {
      await axios.post(`/api/group/groupset/${groupSetId}/group/create`, {
        name: groupName,
        count: groupCount,
      });
      fetchGroupSets();
      setGroupName('');
      setGroupCount(1);
    } catch (err) {
      alert('Failed to create group');
    }
  };

  // Students will have the option to join the specific group (later on will add a timeline for the Teacher where they can see students that are not in a group by the deadline (also created by the professor))
  const handleJoinGroup = async (groupSetId, groupId) => {
    try {
      await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/join`);
      fetchGroupSets();
    } catch (err) {
      alert('Failed to join group');
    }
  };


  // The option of leaving the group
  const handleLeaveGroup = async (groupSetId, groupId) => {
    try {
      await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/leave`);
      fetchGroupSets();
    } catch (err) {
      alert('Failed to leave group');
    }
  };


  // It will be able to filter, search and sort group memebrs but this is not yet implemented in the Group page
  const getFilteredAndSortedMembers = (group) => {
    const filter = memberFilters[group._id] || 'all';
    const sort = memberSorts[group._id] || 'email';
    const search = memberSearches[group._id] || '';
    return group.members
      .filter(m => filter === 'all' || m.status === filter)
      .filter(m => m?._id?.email?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sort === 'email') return a._id.email.localeCompare(b._id.email);
        if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
        if (sort === 'date') return new Date(b.joinDate) - new Date(a.joinDate);
        return 0;
      });
  };


  // Adding all the UI for the functions above
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Group Management</h1>
      {user?.role === 'teacher' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Create GroupSet</h2>
          <input value={groupSetName} onChange={(e) => setGroupSetName(e.target.value)} placeholder="GroupSet name" />
          <button onClick={handleCreateGroupSet}>Create GroupSet</button>
        </div>
      )}

      {groupSets.map((gs) => (
        <div key={gs._id} className="mt-6 border p-4 rounded">
          <h2 className="text-xl font-bold">{gs.name}</h2>
          <p>{gs.groups.length} groups</p>

          {user?.role === 'teacher' && (
            <div className="mt-2">
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
              <input type="number" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} placeholder="Count" />
              <button onClick={() => handleCreateGroup(gs._id)}>Add Group</button>
            </div>
          )}

          {gs.groups.map((g) => (
            <div key={g._id} className="mt-3">
              <strong>{g.name}</strong> ({g.members.length} members)
              <div>
                {user?.role === 'student' && (
                  <>
                    <button onClick={() => handleJoinGroup(gs._id, g._id)}>Join</button>
                    <button onClick={() => handleLeaveGroup(gs._id, g._id)}>Leave</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Groups;