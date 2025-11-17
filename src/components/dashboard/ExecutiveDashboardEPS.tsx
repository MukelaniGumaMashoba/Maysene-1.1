'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import { RefreshCw, TrendingUp, AlertTriangle, Users, Award } from 'lucide-react'

interface DashboardData {
  executive: any
  leaderboard: any[]
  violations: any[]
  performance: any[]
}

export default function ExecutiveDashboardEPS() {
  const [data, setData] = useState<DashboardData>({
    executive: {},
    leaderboard: [],
    violations: [],
    performance: []
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      const endpoints = [
        { name: 'executive', url: '/api/eps-rewards?endpoint=executive-dashboard' },
        { name: 'leaderboard', url: '/api/eps-rewards?endpoint=leaderboard' },
        { name: 'violations', url: '/api/eps-rewards?endpoint=violations' },
        { name: 'performance', url: '/api/eps-rewards?endpoint=performance' }
      ]
      
      const responses = await Promise.all(
        endpoints.map(async ({ name, url }) => {
          try {
            const res = await fetch(url)
            if (!res.ok) return { error: `API returned ${res.status}` }
            return await res.json()
          } catch (error) {
            return { error: `Failed to fetch ${name}` }
          }
        })
      )
      
      const [executive, leaderboard, violations, performance] = responses
      
      setData({
        executive: executive?.error ? {} : (executive || {}),
        leaderboard: leaderboard?.error ? [] : (Array.isArray(leaderboard) ? leaderboard : []),
        violations: violations?.error ? [] : (Array.isArray(violations) ? violations : []),
        performance: performance?.error ? [] : (Array.isArray(performance) ? performance : [])
      })
      
      setLastUpdated(new Date())
    } catch (error) {
      console.warn('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading Executive Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-sky-100 via-blue-50 to-cyan-50 shadow-lg p-6 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">Maysene - Executive Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Real-time fleet performance and analytics</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <p className="text-xs text-slate-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-blue-600">{data.executive.driver_performance?.total_drivers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Drivers</p>
                <p className="text-2xl font-bold text-red-600">{data.executive.driver_performance?.performance_levels?.critical || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gold Drivers</p>
                <p className="text-2xl font-bold text-orange-600">{data.executive.driver_performance?.performance_levels?.gold || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Points</p>
                <p className="text-2xl font-bold text-purple-600">{data.executive.driver_performance?.average_points || 0}</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-2xl font-bold text-yellow-600">{data.executive.violations_summary?.total_violations || 0}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-sm font-semibold">!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Charts */}
      <div className="space-y-8">
        {/* Driver Leaderboard */}
        {data.leaderboard.length > 0 && (
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800">Driver Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <BarChart
                xAxis={[{
                  scaleType: 'band',
                  data: data.leaderboard
                    .sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0))
                    .slice(0, 10)
                    .map(d => d.driverName || 'Unknown')
                }]}
                series={[{
                  data: data.leaderboard
                    .sort((a, b) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0))
                    .slice(0, 10)
                    .map(d => Number(d.totalPoints) || 0),
                  label: 'Points',
                  color: '#3B82F6'
                }]}
                height={300}
              />
            </CardContent>
          </Card>
        )}

        {/* Performance Levels Chart */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">Driver Performance Levels</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <PieChart
              series={[{
                data: [
                  { id: 0, value: data.executive.driver_performance?.performance_levels?.gold || 0, label: 'Gold', color: '#FFD700' },
                  { id: 1, value: data.executive.driver_performance?.performance_levels?.silver || 0, label: 'Silver', color: '#C0C0C0' },
                  { id: 2, value: data.executive.driver_performance?.performance_levels?.bronze || 0, label: 'Bronze', color: '#CD7F32' },
                  { id: 3, value: data.executive.driver_performance?.performance_levels?.critical || 0, label: 'Critical', color: '#EF4444' }
                ]
              }]}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Violations Summary */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">Violations Summary</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <BarChart
              xAxis={[{
                scaleType: 'band',
                data: ['Speed', 'Route', 'Night']
              }]}
              series={[{
                data: [
                  data.executive.violations_summary?.speed_violations || 0,
                  data.executive.violations_summary?.route_violations || 0,
                  data.executive.violations_summary?.night_violations || 0
                ],
                label: 'Violations',
                color: '#EF4444'
              }]}
              height={300}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}