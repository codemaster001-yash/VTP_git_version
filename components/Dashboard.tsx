import React from 'react';
import { Trip, TripItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DollarSign, MapPin, Clock, IndianRupee } from 'lucide-react';

interface DashboardProps {
  trip: Trip;
}

const COLORS = {
  Transport: '#3b82f6', // Blue
  Accommodation: '#10b981', // Emerald
  Food: '#f97316', // Orange
  Activities: '#8b5cf6', // Violet
  Remaining: '#e2e8f0' // Slate
};

const Dashboard: React.FC<DashboardProps> = ({ trip }) => {
  // 1. Calculate Costs Deeply (Checking SubItems)
  let transportCost = 0;
  let accommodationCost = 0;
  let foodCost = 0;
  let activitiesCost = 0;

  // Count stats
  let stopsCount = trip.items.length;
  let activitiesCount = 0;
  let staysCount = 0;
  let foodCount = 0;

  // Add top-level accommodation array costs (if any legacy data exists)
  trip.accommodations.forEach(acc => {
      accommodationCost += acc.costPerNight;
      staysCount++;
  });

  trip.items.forEach(item => {
      // Top Level Transport (Transport to Next)
      if (item.transportDetails?.cost) {
          transportCost += item.transportDetails.cost;
      }

      // Sub Items Analysis
      if (item.subItems) {
          item.subItems.forEach(sub => {
              if (sub.type === 'Stay') {
                  accommodationCost += sub.cost;
                  staysCount++;
              } else if (sub.type === 'Food') {
                  foodCost += sub.cost;
                  foodCount++;
              } else if (sub.type === 'Activity') {
                  activitiesCost += sub.cost;
                  activitiesCount++;
              } else {
                  // Fallback for generic
                  activitiesCost += sub.cost;
              }
          });
      }
  });
  
  const totalCost = transportCost + accommodationCost + foodCost + activitiesCost;
  const remainingBudget = Math.max(0, trip.totalBudget - totalCost);

  const costData = [
    { name: 'Transport', value: transportCost, color: COLORS.Transport },
    { name: 'Accommodation', value: accommodationCost, color: COLORS.Accommodation },
    { name: 'Food', value: foodCost, color: COLORS.Food },
    { name: 'Activities', value: activitiesCost, color: COLORS.Activities },
    { name: 'Remaining', value: remainingBudget, color: COLORS.Remaining }
  ].filter(d => d.value > 0); // Only show segments with value

  // Duration Logic
  const displayStartDate = trip.items[0]?.transportDetails?.departureTime 
        ? new Date(trip.items[0].transportDetails.departureTime) 
        : new Date(trip.startDate);
        
  const displayEndDate = trip.items.length > 0 && trip.items[trip.items.length-1].transportDetails?.arrivalTime 
        ? new Date(trip.items[trip.items.length-1].transportDetails!.arrivalTime!) 
        : new Date(trip.endDate);
  
  const diffTime = displayEndDate.getTime() - displayStartDate.getTime();
  const durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 3600 * 24)));

  return (
    <div className="p-6 bg-white shadow-sm rounded-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Trip Dashboard</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="flex items-center text-blue-600 mb-2">
            <IndianRupee className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Total Cost</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">₹{totalCost.toLocaleString()}</div>
          <div className="text-xs text-slate-500">of ₹{trip.totalBudget.toLocaleString()} budget</div>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <div className="flex items-center text-emerald-600 mb-2">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Itinerary Items</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stopsCount + activitiesCount + staysCount + foodCount}</div>
          <div className="text-xs text-slate-500">{stopsCount} Stops, {activitiesCount} Activities</div>
        </div>

         <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <div className="flex items-center text-indigo-600 mb-2">
            <Clock className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Duration</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
             {durationDays} Days
          </div>
          <div className="text-xs text-slate-500">
              {displayStartDate.toLocaleDateString()} - {displayEndDate.toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-50 rounded-lg p-4 border border-slate-100">
          <h3 className="text-sm font-bold mb-4 text-slate-700 uppercase tracking-wide">Budget Breakdown</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={costData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} stroke="#fff" />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `₹${value.toLocaleString()}`} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

         <div className="h-80 bg-slate-50 rounded-lg p-4 border border-slate-100">
          <h3 className="text-sm font-bold mb-4 text-slate-700 uppercase tracking-wide">Itinerary Balance</h3>
           <ResponsiveContainer width="100%" height="90%">
            <BarChart data={[
                { name: 'Stops', value: stopsCount, fill: '#64748b' },
                { name: 'Travel', value: stopsCount - 1 > 0 ? stopsCount - 1 : 0, fill: COLORS.Transport },
                { name: 'Activities', value: activitiesCount, fill: COLORS.Activities },
                { name: 'Food', value: foodCount, fill: COLORS.Food },
                { name: 'Stays', value: staysCount, fill: COLORS.Accommodation }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                 {
                    [
                        { name: 'Stops', value: stopsCount, fill: '#64748b' },
                        { name: 'Travel', value: stopsCount - 1, fill: COLORS.Transport },
                        { name: 'Activities', value: activitiesCount, fill: COLORS.Activities },
                        { name: 'Food', value: foodCount, fill: COLORS.Food },
                        { name: 'Stays', value: staysCount, fill: COLORS.Accommodation }
                    ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))
                 }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;