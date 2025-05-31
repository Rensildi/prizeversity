import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../styles/MemberManagement.css';
import socket from '../utils/socket';

import toast from 'react-hot-toast';
import { LoaderIcon } from 'lucide-react';

const Classroom = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state
  const [students, setStudents] = useState([]);
  const [bazaars, setBazaars] = useState([]);
  const [groupSets, setGroupSets] = useState([]);
  const [updateClassroomName, setUpdateClassroomName] = useState('');
  const [updateClassroomImage, setUpdateClassroomImage] = useState('');
  const [bazaarName, setBazaarName] = useState('');
  const [bazaarDescription, setBazaarDescription] = useState('');
  const [bazaarImage, setBazaarImage] = useState('');
  const [groupSetName, setGroupSetName] = useState('');
  const [groupSetSelfSignup, setGroupSetSelfSignup] = useState(false);
  const [groupSetJoinApproval, setGroupSetJoinApproval] = useState(false);
  const [groupSetMaxMembers, setGroupSetMaxMembers] = useState('');
  const [groupSetImage, setGroupSetImage] = useState('');
  const [editingGroupSet, setEditingGroupSet] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [groupMaxMembers, setGroupMaxMembers] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupCount, setGroupCount] = useState(1);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editingClassroom, setEditingClassroom] = useState(false);
  const [memberFilters, setMemberFilters] = useState({});
  const [memberSorts, setMemberSorts] = useState({});
  const [memberSearches, setMemberSearches] = useState({});

  useEffect(() => {
    // Don't try to fetch data if there's no user yet
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        await fetchClassroomDetails();
      } catch (err) {
        // Check if error is due to unauthorized access
        if (err.response?.status === 401) {
          localStorage.removeItem('hadPreviousSession');
          navigate('/?session_expired=true');
          return;
        }
        console.error('Error fetching classroom details:', err);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  useEffect(() => {
    // Join classroom socket room
    socket.emit('join', `classroom-${id}`);

    socket.on('classroom_update', (updatedClassroom) => {
      setClassroom(updatedClassroom);
    });

    socket.on('groupset_update', (updatedGroupSet) => {
      setGroupSets(prevGroupSets => 
        prevGroupSets.map(gs => 
          gs._id === updatedGroupSet._id ? updatedGroupSet : gs
        )
      );
    });

    socket.on('group_update', ({ groupSet: groupSetId, group: updatedGroup }) => {
      setGroupSets(prevGroupSets => 
        prevGroupSets.map(gs => {
          if (gs._id === groupSetId) {
            return {
              ...gs,
              groups: gs.groups.map(g => 
                g._id === updatedGroup._id ? updatedGroup : g
              )
            };
          }
          return gs;
        })
      );
    });

    return () => {
      socket.off('classroom_update');
      socket.off('groupset_update');
      socket.off('group_update');
    };
  }, [id]);

  useEffect(() => {
    socket.on('classroom_removal', (data) => {
      if (data.classroomId === id) {
        alert(data.message);
        navigate('/');
      }
    });

    socket.on('groupset_create', (newGroupSet) => {
      setGroupSets(prev => [...prev, newGroupSet]);
    });

    return () => {
      socket.off('classroom_removal');
      socket.off('groupset_create');
    };
  }, [id, navigate]);

  useEffect(() => {
    socket.on('classroom_update', (updatedClassroom) => {
      setClassroom(updatedClassroom);
    });

    socket.on('groupset_delete', (groupSetId) => {
      setGroupSets(prev => prev.filter(gs => gs._id !== groupSetId));
    });

    socket.on('group_delete', ({ groupSetId, groupId }) => {
      setGroupSets(prev => prev.map(gs => {
        if (gs._id === groupSetId) {
          return {
            ...gs,
            groups: gs.groups.filter(g => g._id !== groupId)
          };
        }
        return gs;
      }));
    });

    return () => {
      socket.off('classroom_update');
      socket.off('groupset_delete');
      socket.off('group_delete');
    };
  }, []);

  useEffect(() => {
    socket.on('notification', (notification) => {
      // Handle classroom rename notifications while inside classroom
      if (notification.type === 'classroom_update' && 
          notification.classroom?._id === id) {
        fetchClassroom();
      }
    });

    return () => {
      socket.off('notification');
    };
  }, [id]);

  const fetchClassroomDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/classroom/${id}`);
      // Check if user still has access to this classroom
      const classroom = response.data;
      const hasAccess = user.role === 'teacher' ? 
        classroom.teacher === user._id :
        classroom.students.includes(user._id);

      if (!hasAccess) {
        alert('You no longer have access to this classroom');
        navigate('/');
        return;
      }
      
      setClassroom(response.data);
      await fetchBazaars();
      await fetchGroupSets();
      await fetchStudents();
    } catch (err) {
      if (err.response?.status === 403) {
        alert('You no longer have access to this classroom');
        navigate('/');
        return;
      }
      // Let the error bubble up to the parent try-catch
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchClassroom = async () => {
    try {
      const response = await axios.get(`/api/classroom/${id}`);
      setClassroom(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        throw err; // Let parent handle the 401
      }
      console.error('Failed to fetch classroom', err);
    }
  };

  const fetchBazaars = async () => {
    try {
      const response = await axios.get(`/api/bazaar/classroom/${id}`);
      setBazaars(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        throw err;
      }
      console.error('Failed to fetch bazaars', err);
    }
  };

  const fetchGroupSets = async () => {
    try {
      const response = await axios.get(`/api/group/groupset/classroom/${id}`);
      setGroupSets(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        throw err;
      }
      console.error('Failed to fetch group sets', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`/api/classroom/${id}/students`);
      setStudents(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        throw err;
      }
      console.error('Failed to fetch students', err);
    }
  };

  const handleUpdateClassroom = async () => {
    try {
      const response = await axios.put(`/api/classroom/${id}`, {
        name: updateClassroomName || classroom.name,
        image: updateClassroomImage || classroom.image
      });
      
      if (response.data.message === 'No changes were made') {
        // alert('No changes were made');
        toast.error('No changes were made!');
      } else {
        // alert('Classroom updated successfully!');
        toast.success('Classroom updated successfully!');
        setEditingClassroom(false);
        setUpdateClassroomName('');
        setUpdateClassroomImage('');
        fetchClassroom();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to update classroom';
      alert(errorMessage);
    }
  };

  const handleCreateBazaar = async () => {
    try {
      await axios.post('/api/bazaar/create', {
        name: bazaarName,
        description: bazaarDescription,
        image: bazaarImage,
        classroomId: id,
      });
      alert('Bazaar created successfully!');
      fetchBazaars();
      setBazaarName('');
      setBazaarDescription('');
      setBazaarImage('');
    } catch (err) {
      console.error('Failed to create bazaar', err);
      alert('Failed to create bazaar');
    }
  };

  const handleCreateGroupSet = async () => {
    if (!groupSetName.trim()) {
      alert('GroupSet name is required');
      return;
    }
  
    if (groupSetMaxMembers < 0) {
      alert('Max members cannot be a negative number');
      return;
    }
  
    try {
      const response = await axios.post('/api/group/groupset/create', {
        name: groupSetName,
        classroomId: id,
        selfSignup: groupSetSelfSignup,
        joinApproval: groupSetJoinApproval,
        maxMembers: groupSetMaxMembers,
        image: groupSetImage,
      });
      console.log('GroupSet created:', response.data);
      alert('GroupSet created successfully!');
      setGroupSetName('');
      setGroupSetSelfSignup(false);
      setGroupSetJoinApproval(false);
      setGroupSetMaxMembers('');
      setGroupSetImage('');
      fetchGroupSets();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        console.error('Failed to create group set', err);
        alert('Failed to create group set');
      }
    }
  };
  

  const handleEditGroupSet = (groupSet) => {
    setEditingGroupSet(groupSet);
    setGroupSetName(groupSet.name);
    setGroupSetSelfSignup(groupSet.selfSignup);
    setGroupSetJoinApproval(groupSet.joinApproval);
    setGroupSetMaxMembers(groupSet.maxMembers || '');
    setGroupSetImage(groupSet.image);
  };

  const handleUpdateGroupSet = async () => {
    try {
      const response = await axios.put(`/api/group/groupset/${editingGroupSet._id}`, {
        name: groupSetName,
        selfSignup: groupSetSelfSignup,
        joinApproval: groupSetJoinApproval,
        maxMembers: groupSetMaxMembers,
        image: groupSetImage,
      });

      if (response.data.message === 'No changes were made') {
        alert('No changes were made');
      } else {
        alert('GroupSet updated successfully!');
        setEditingGroupSet(null);
        setGroupSetName('');
        setGroupSetSelfSignup(false);
        setGroupSetJoinApproval(false);
        setGroupSetMaxMembers('');
        setGroupSetImage('');
        fetchGroupSets();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to update groupset';
      alert(errorMessage);
    }
  };

  const handleDeleteGroupSet = async (groupSetId) => {
    try {
      await axios.delete(`/api/group/groupset/${groupSetId}`);
      alert('GroupSet deleted successfully!');
      fetchGroupSets();
    } catch (err) {
      console.error('Failed to delete group set', err);
      alert('Failed to delete group set');
    }
  };

  const handleCreateGroup = async (groupSetId) => {
    if (!groupName.trim()) {
      alert('Group name is required');
      return;
    }
  
    if (groupCount <= 0) {
      alert('Number of groups must be greater than 0');
      return;
    }
  
    try {
      const response = await axios.post(`/api/group/groupset/${groupSetId}/group/create`, {
        name: groupName,
        count: groupCount,
      });
      console.log('Groups created:', response.data);
      alert('Groups created successfully!');
      setGroupName('');
      setGroupCount(1);
      fetchGroupSets();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        console.error('Failed to create groups', err);
        alert('Failed to create groups');
      }
    }
  };
  

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupImage(group.image);
    setGroupMaxMembers(group.maxMembers || '');
  };

  const handleUpdateGroup = async (groupSetId, groupId) => {
    try {
      const response = await axios.put(`/api/group/groupset/${groupSetId}/group/${groupId}`, {
        name: groupName,
        image: groupImage,
        maxMembers: groupMaxMembers,
      });

      if (response.data.message === 'No changes were made') {
        alert('No changes were made');
      } else {
        alert('Group updated successfully!');
        setEditingGroup(null);
        setGroupName('');
        setGroupImage('');
        setGroupMaxMembers('');
        fetchGroupSets();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to update group';
      alert(errorMessage);
    }
  };

  const handleDeleteGroup = async (groupSetId, groupId) => {
    try {
      await axios.delete(`/api/group/groupset/${groupSetId}/group/${groupId}`);
      alert('Group deleted successfully!');
      fetchGroupSets();
    } catch (err) {
      console.error('Failed to delete group', err);
      alert('Failed to delete group');
    }
  };

  const handleJoinGroup = async (groupSetId, groupId) => {
    try {
      // Check if user is already in any group in this groupset
      const currentGroupSet = groupSets.find(gs => gs._id === groupSetId);
      if (currentGroupSet) {
        const isInAnyGroup = currentGroupSet.groups.some(group => 
          group.members.some(member => 
            member._id._id === user._id && 
            (member.status === 'approved' || member.status === 'pending')
          )
        );
        
        if (isInAnyGroup) {
          alert('You are already a member or have a pending request in this GroupSet');
          return;
        }
      }
  
      const response = await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/join`);
      alert(response.data.message);
      fetchGroupSets();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        console.error('Failed to join group', err);
        alert('Failed to join group');
      }
    }
  };

  const handleLeaveGroup = async (groupSetId, groupId) => {
    try {
      const response = await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/leave`);
      console.log('Leave group response:', response.data);
      alert(response.data.message); // Will show either success message or "You're not a member" message
      fetchGroupSets();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        console.error('Failed to leave group', err);
        alert('Failed to leave group');
      }
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await axios.delete(`/api/classroom/${id}/students/${studentId}`);
      alert('Student removed successfully!');
      // Fetch both students and group sets to update the UI
      await Promise.all([
        fetchStudents(),
        fetchGroupSets()
      ]);
    } catch (err) {
      console.error('Failed to remove student', err);
      alert('Failed to remove student');
    }
  };

  const handleLeaveClassroom = async () => {
    try {
      await axios.post(`/api/classroom/${id}/leave`);
      // alert('Left classroom successfully!');
      toast.success('Left classroom successfully!');
      navigate('/classrooms');
    } catch (err) {
      console.error('Failed to leave classroom', err);
      // alert('Failed to leave classroom');
      toast.error("Failed to leave classroom!");
    }
  };

  const handleDeleteClassroom = async () => {
    try {
      await axios.delete(`/api/classroom/${id}`);
      alert('Classroom deleted successfully!');
      navigate('/');
    } catch (err) {
      console.error('Failed to delete classroom', err);
      alert('Failed to delete classroom');
    }
  };

  const handleSelectMember = (groupId, memberId) => {
    setSelectedMembers(prevSelected => ({
      ...prevSelected,
      [groupId]: prevSelected[groupId]
        ? prevSelected[groupId].includes(memberId)
          ? prevSelected[groupId].filter(id => id !== memberId)
          : [...prevSelected[groupId], memberId]
        : [memberId]
    }));
  };

  const handleSelectAllMembers = (groupId, group) => {
    setSelectedMembers(prevSelected => {
      const allMemberIds = group.members.map(member => member._id._id);
      const currentGroupSelected = prevSelected[groupId] || [];
      const newGroupSelectedMembers = currentGroupSelected.length === allMemberIds.length 
        ? []  // If all are selected, unselect all
        : allMemberIds;  // Otherwise, select all
      return { ...prevSelected, [groupId]: newGroupSelectedMembers };
    });
  };

  const handleSuspendMembers = async (groupSetId, groupId) => {
    const groupSelectedMembers = selectedMembers[groupId] || [];
    if (groupSelectedMembers.length === 0) {
      alert('No members selected for suspension.');
      return;
    }
  
    try {
      const response = await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/suspend`, {
        memberIds: groupSelectedMembers
      });
      alert(response.data.message);
      setSelectedMembers((prevSelected) => ({ ...prevSelected, [groupId]: [] }));
      fetchGroupSets();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        console.error('Failed to suspend members', err);
        alert('Failed to suspend members');
      }
    }
  };

  const handleCancelUpdate = () => {
    setEditingClassroom(false);
    setEditingGroupSet(null);
    setEditingGroup(null);
    setGroupSetName('');
    setGroupSetSelfSignup(false);
    setGroupSetJoinApproval(false);
    setGroupSetMaxMembers('');
    setGroupSetImage('');
    setGroupName('');
    setGroupImage('');
    setGroupMaxMembers('');
  };

  // Add these confirmation handlers
  const handleLeaveClassroomConfirm = async () => {
    if (window.confirm(`You are about to leave the classroom "${classroom.name}". If you're a member of any group(s) in this classroom, you will be automatically removed. Are you sure you want to proceed?`)) {
      try {
        await axios.post(`/api/classroom/${id}/leave`);
        // alert('Left classroom successfully!');
        toast.success('Left classroom successfully!');
        navigate('/classrooms');
      } catch (err) {
        console.error('Failed to leave classroom', err);
        // alert('Failed to leave classroom');
        toast.error('Failed to leave classroom!');
      }
    }
  };

  const handleDeleteClassroomConfirm = async () => {
    if (window.confirm(`You're about to delete classroom "${classroom.name}". All data will be purged! Are you sure you want to proceed?`)) {
      try {
        await axios.delete(`/api/classroom/${id}`);
        // alert('Classroom deleted successfully!');
        toast.success('Classroom deleted successfully!');
        navigate('/classrooms');
      } catch (err) {
        console.error('Failed to delete classroom', err);
        // alert('Failed to delete classroom');
        toast.error('Failed to delete classroom!');
      }
    }
  };

  const handleRemoveStudentConfirm = async (studentId) => {
    if (window.confirm('Are you sure you want to proceed with the removal? Any group associations will be disconnected as well.')) {
      try {
        await axios.delete(`/api/classroom/${id}/students/${studentId}`);
        alert('Student removed successfully!');
        await Promise.all([
          fetchStudents(),
          fetchGroupSets()
        ]);
      } catch (err) {
        console.error('Failed to remove student', err);
        alert('Failed to remove student');
      }
    }
  };

  const handleDeleteGroupSetConfirm = async (groupSet) => {
    if (window.confirm(`You're about to delete this GroupSet "${groupSet.name}". All student enrollment in any groups within this GroupSet will be purged alongside the groups themselves. Are you sure you want to proceed?`)) {
      try {
        await axios.delete(`/api/group/groupset/${groupSet._id}`);
        alert('GroupSet deleted successfully!');
        fetchGroupSets();
      } catch (err) {
        console.error('Failed to delete group set', err);
        alert('Failed to delete group set');
      }
    }
  };

  const handleDeleteGroupConfirm = async (groupSetId, group) => {
    if (window.confirm(`You're about to delete this group "${group.name}". Any students enrolled in the group will be removed. Are you sure you want to proceed?`)) {
      try {
        await axios.delete(`/api/group/groupset/${groupSetId}/group/${group._id}`);
        alert('Group deleted successfully!');
        fetchGroupSets();
      } catch (err) {
        console.error('Failed to delete group', err);
        alert('Failed to delete group');
      }
    }
  };

  // Add these handler functions
const handleApproveMembers = async (groupSetId, groupId) => {
  const groupSelectedMembers = selectedMembers[groupId] || [];
  if (groupSelectedMembers.length === 0) {
    alert('No selection with pending status made to perform this action.');
    return;
  }

  try {
    const response = await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/approve`, {
      memberIds: groupSelectedMembers
    });
    alert(response.data.message);
    setSelectedMembers((prevSelected) => ({ ...prevSelected, [groupId]: [] }));
    fetchGroupSets();
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      alert(err.response.data.message);
    } else {
      console.error('Failed to approve members', err);
      alert('Failed to approve members');
    }
  }
};

const handleRejectMembers = async (groupSetId, groupId) => {
  const groupSelectedMembers = selectedMembers[groupId] || [];
  if (groupSelectedMembers.length === 0) {
    alert('No selection with pending status made to perform this action.');
    return;
  }

  try {
    const response = await axios.post(`/api/group/groupset/${groupSetId}/group/${groupId}/reject`, {
      memberIds: groupSelectedMembers
    });
    alert(response.data.message);
    setSelectedMembers((prevSelected) => ({ ...prevSelected, [groupId]: [] }));
    fetchGroupSets();
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      alert(err.response.data.message);
    } else {
      console.error('Failed to reject members', err);
      alert('Failed to reject members');
    }
  }
};

const getFilteredAndSortedMembers = (group) => {
  const filter = memberFilters[group._id] || 'all';
  const sort = memberSorts[group._id] || 'email';
  const search = memberSearches[group._id] || '';

  return group.members
    .filter(member => {
      if (filter === 'all') return true;
      return member.status === filter;
    })
    .filter(member => 
      // Add null checks
      member?._id?.email?.toLowerCase().includes(search.toLowerCase()) ?? false
    )
    .sort((a, b) => {
      switch (sort) {
        case 'email':
          // Add null checks
          return (a?._id?.email ?? '').localeCompare(b?._id?.email ?? '');
        case 'status':
          return (a.status || 'approved').localeCompare(b.status || 'approved');
        case 'date':
          return new Date(b.joinDate) - new Date(a.joinDate);
        default:
          return 0;
      }
    });
};

const handleFilterChange = (groupId, value) => {
  setMemberFilters(prev => ({
    ...prev,
    [groupId]: value
  }));
};

const handleSortChange = (groupId, value) => {
  setMemberSorts(prev => ({
    ...prev,
    [groupId]: value
  }));
};

const handleSearchChange = (groupId, value) => {
  setMemberSearches(prev => ({
    ...prev,
    [groupId]: value
  }));
};

  // Add loading check at the start of render
  if (loading || !user) {
    return (
    <div className='min-h-screen bg-base-200 flex items-center justify-center'>
      <LoaderIcon className='animate-spin, size-10' />
    </div>
    );
  };

  if (!user) {
    return <div>Please log in to view this classroom.</div>;
  }

  if (loading) {
    return <div>Loading classroom details...</div>;
  }

  if (!classroom) {
    return (
      <div className='min-h-screen bg-base-200 flex items-center justify-center'>
        <LoaderIcon className='animate-spin, size-10' />
      </div>
    );
  };

  return (
    <div>
      <h1>{classroom.name}</h1>
      <p>Class Code: {classroom.code}</p>
      {(user.role === 'teacher' || user.role === 'admin') && (
        <div>
          {editingClassroom ? (
            <div>
              <h4>Update Classroom</h4>
              <input
                type="text"
                placeholder="New Classroom Name"
                value={updateClassroomName}
                onChange={(e) => setUpdateClassroomName(e.target.value)}
              />
              <input
                type="text"
                placeholder="New Image URL"
                value={updateClassroomImage}
                onChange={(e) => setUpdateClassroomImage(e.target.value)}
              />
              <button onClick={handleUpdateClassroom}>Update Classroom</button>
              <button onClick={handleCancelUpdate}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingClassroom(true)}>Edit Classroom</button>
          )}

          <button onClick={handleLeaveClassroomConfirm}>Leave Classroom</button>

          {user.role === 'teacher' && (
            <button onClick={handleDeleteClassroomConfirm}>Delete Classroom</button>
          )}

          
          <div>
            <h3>Students</h3>
            <ul>
              {students.map((student) => (
                <li key={student._id}>
                  {student.email}
                  <button onClick={() => handleRemoveStudentConfirm(student._id)}>Remove Student</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Group Sets</h3>
            <ul>
              {groupSets.map((groupSet) => (
                <li key={groupSet._id}>
                  <h4>{groupSet.name}</h4>
                  <p>Self Signup: {groupSet.selfSignup ? 'Yes' : 'No'}</p>
                  <p>Join Approval: {groupSet.joinApproval ? 'Yes' : 'No'}</p>
                  <p>Max Members: {groupSet.maxMembers || 'No limit'}</p>
                  <p>Image: <img src={groupSet.image} alt={groupSet.name} width="50" /></p>
                  <button onClick={() => handleEditGroupSet(groupSet)}>Edit</button>
                  <button onClick={() => handleDeleteGroupSetConfirm(groupSet)}>Delete</button>
                  <div>
                    <h4>Create Group</h4>
                    <input
                      type="text"
                      placeholder="Group Name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Number of Groups"
                      value={groupCount}
                      onChange={(e) => setGroupCount(Math.max(1, e.target.value))}
                    />
                    <button onClick={() => handleCreateGroup(groupSet._id)}>Create Groups</button>
                  </div>
                  <div>
                    <h4>Groups</h4>
                    <ul>
                      {groupSet.groups.map((group) => (
                        <li key={group._id}>
                          <h5>{group.name}</h5>
                          <p>Members: {group.members.length}/{group.maxMembers || 'No limit'}</p>
                          <button onClick={() => handleJoinGroup(groupSet._id, group._id)}>Join Group</button>
                          <button onClick={() => handleLeaveGroup(groupSet._id, group._id)}>Leave Group</button>
                          <button onClick={() => handleEditGroup(group)}>Edit</button>
                          <button onClick={() => handleDeleteGroupConfirm(groupSet._id, group)}>Delete</button>
                          {editingGroup && editingGroup._id === group._id && (
                            <div>
                              <h4>Update Group</h4>
                              <input
                                type="text"
                                placeholder="Group Name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder="Image URL"
                                value={groupImage}
                                onChange={(e) => setGroupImage(e.target.value)}
                              />
                              <input
                                type="number"
                                placeholder="Max Members"
                                value={groupMaxMembers}
                                onChange={(e) => setGroupMaxMembers(Math.max(0, e.target.value))}
                              />
                              <button onClick={() => handleUpdateGroup(groupSet._id, group._id)}>Update Group</button>
                              <button onClick={handleCancelUpdate}>Cancel</button>
                            </div>
                          )}
                          <div>
                            <h5>Members</h5>
                            <div className="member-controls">
                              <input
                                type="text"
                                placeholder="Search members..."
                                value={memberSearches[group._id] || ''}
                                onChange={(e) => handleSearchChange(group._id, e.target.value)}
                                className="member-search"
                              />
                              <select
                                value={memberFilters[group._id] || 'all'}
                                onChange={(e) => handleFilterChange(group._id, e.target.value)}
                                className="member-filter"
                              >
                                <option value="all">All Members</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                              </select>
                              <select
                                value={memberSorts[group._id] || 'email'}
                                onChange={(e) => handleSortChange(group._id, e.target.value)}
                                className="member-sort"
                              >
                                <option value="email">Sort by Email</option>
                                <option value="status">Sort by Status</option>
                                <option value="date">Sort by Join Date</option>
                              </select>
                            </div>
                            <table className="member-table">
                              <thead>
                                <tr>
                                  <th>
                                    <input
                                      type="checkbox"
                                      checked={(selectedMembers[group._id]?.length || 0) === group.members.length}
                                      onChange={() => handleSelectAllMembers(group._id, group)}
                                    />
                                  </th>
                                  <th>Name/Email</th>
                                  <th>Status</th>
                                  <th>Join Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getFilteredAndSortedMembers(group).map((member, index) => (
                                  <tr 
                                    key={`${group._id}-${member._id._id}-${member.joinDate}-${index}`}
                                    className={member.status === 'pending' ? 'pending-member' : ''}
                                  >
                                    <td>
                                      <input
                                        type="checkbox"
                                        checked={selectedMembers[group._id]?.includes(member._id._id) || false}
                                        onChange={() => handleSelectMember(group._id, member._id._id)}
                                      />
                                    </td>
                                    <td>{member._id.email}</td>
                                    <td>
                                      <span className={`status-badge ${member.status || 'approved'}`}>
                                        {member.status || 'approved'}
                                      </span>
                                    </td>
                                    <td>{member.status === 'approved' ? new Date(member.joinDate).toLocaleString() : 'Pending'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="bulk-actions">
                              <button 
                                onClick={() => handleApproveMembers(groupSet._id, group._id)}
                                disabled={!selectedMembers[group._id]?.length}
                                className="approve-button"
                              >
                                Approve Selected
                              </button>
                              <button 
                                onClick={() => handleRejectMembers(groupSet._id, group._id)}
                                disabled={!selectedMembers[group._id]?.length}
                                className="reject-button"
                              >
                                Reject Selected
                              </button>
                              <button 
                                onClick={() => handleSuspendMembers(groupSet._id, group._id)}
                                disabled={!selectedMembers[group._id]?.length}
                                className="suspend-button"
                              >
                                Suspend Selected
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{editingGroupSet ? 'Update GroupSet' : 'Create GroupSet'}</h4>
            <input
              type="text"
              placeholder="GroupSet Name"
              value={groupSetName}
              onChange={(e) => setGroupSetName(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={groupSetSelfSignup}
                onChange={(e) => setGroupSetSelfSignup(e.target.checked)}
              />
              Allow Self-Signup
            </label>
            <label>
              <input
                type="checkbox"
                checked={groupSetJoinApproval}
                onChange={(e) => setGroupSetJoinApproval(e.target.checked)}
              />
              Require Join Approval
            </label>
            <input
              type="number"
              placeholder="Max Members"
              value={groupSetMaxMembers}
              onChange={(e) => setGroupSetMaxMembers(Math.max(0, e.target.value))}
            />
            <input
              type="text"
              placeholder="Image URL"
              value={groupSetImage}
              onChange={(e) => setGroupSetImage(e.target.value)}
            />
            <button onClick={editingGroupSet ? handleUpdateGroupSet : handleCreateGroupSet}>
              {editingGroupSet ? 'Update GroupSet' : 'Create GroupSet'}
            </button>
            {editingGroupSet && <button onClick={handleCancelUpdate}>Cancel</button>}
          </div>
        </div>
      )}
      {user.role === 'student' && (
        <div>
          <button onClick={handleLeaveClassroomConfirm}>Leave Classroom</button>
          <div>
            <h3>Group Sets</h3>
            <ul>
              {groupSets.map((groupSet) => (
                <li key={groupSet._id}>
                  <h4>{groupSet.name}</h4>
                  <p>Self Signup: {groupSet.selfSignup ? 'Yes' : 'No'}</p>
                  <p>Join Approval: {groupSet.joinApproval ? 'Yes' : 'No'}</p>
                  <p>Max Members: {groupSet.maxMembers || 'No limit'}</p>
                  <p>Image: <img src={groupSet.image} alt={groupSet.name} width="50" /></p>
                  <div>
                    <h4>Groups</h4>
                    <ul>
                      {groupSet.groups.map((group) => (
                        <li key={group._id}>
                          <h5>{group.name}</h5>
                          <p>Members: {group.members.length}/{group.maxMembers || 'No limit'}</p>
                          <button onClick={() => handleJoinGroup(groupSet._id, group._id)}>Join Group</button>
                          <button onClick={() => handleLeaveGroup(groupSet._id, group._id)}>Leave Group</button>
                          <div>
                            <h5>Members</h5>
                            <div className="member-controls">
                              <input
                                type="text"
                                placeholder="Search members..."
                                value={memberSearches[group._id] || ''}
                                onChange={(e) => handleSearchChange(group._id, e.target.value)}
                                className="member-search"
                              />
                              <select
                                value={memberFilters[group._id] || 'all'}
                                onChange={(e) => handleFilterChange(group._id, e.target.value)}
                                className="member-filter"
                              >
                                <option value="all">All Members</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                              </select>
                              <select
                                value={memberSorts[group._id] || 'email'}
                                onChange={(e) => handleSortChange(group._id, e.target.value)}
                                className="member-sort"
                              >
                                <option value="email">Sort by Email</option>
                                <option value="status">Sort by Status</option>
                                <option value="date">Sort by Join Date</option>
                              </select>
                            </div>
                            <table className="member-table">
                              <thead>
                                <tr>
                                  <th>Name/Email</th>
                                  <th>Status</th>
                                  <th>Join Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getFilteredAndSortedMembers(group).map((member, index) => (
                                  <tr 
                                    key={`${group._id}-${member._id._id}-${member.joinDate}-${index}`}
                                    className={member.status === 'pending' ? 'pending-member' : ''}
                                  >
                                    <td>{member._id.email}</td>
                                    <td>
                                      <span className={`status-badge ${member.status || 'approved'}`}>
                                        {member.status || 'approved'}
                                      </span>
                                    </td>
                                    <td>{member.status === 'approved' ? new Date(member.joinDate).toLocaleString() : 'Pending'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classroom;