'use client';

import { DashHeader } from '@/components/dashboard/dash-header';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRightIcon, ArrowDownRightIcon, MoreVerticalCircle01Icon, MoreHorizontalCircle01Icon, TradeUpIcon, TradeDownIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '@/app/actions';
import { formatCurrency } from '@/lib/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const result = await getDashboardStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        // Error silencioso
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className='h-dvh absolute inset-0 flex items-center justify-center'>
        <Spinner className='size-6' />
      </div>
    );
  }

  if (!stats) {
    return (
      <React.Fragment>
        <DashHeader title='Dashboard' />
        <div className='p-6'>
          <Card>
            <CardContent className='pt-6'>
              <p className='text-center text-muted-foreground'>
                No se pudieron cargar las estadísticas
              </p>
            </CardContent>
          </Card>
        </div>
      </React.Fragment>
    );
  }

  const metrics = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(stats.totalRevenue),
      change: stats.growthRate >= 0 ? `+${stats.growthRate.toFixed(1)}%` : `${stats.growthRate.toFixed(1)}%`,
      trend: stats.growthRate >= 0 ? 'up' : 'down',
      description: stats.growthRate >= 0 ? 'Incremento este mes' : 'Disminución este mes',
      detail: 'Ventas de los últimos 30 días',
    },
    {
      title: 'Nuevos Clientes',
      value: stats.newCustomers.toLocaleString(),
      change: '+0%',
      trend: 'up',
      description: 'Sesiones únicas',
      detail: 'Clientes activos este mes',
    },
    {
      title: 'Sesiones',
      value: stats.productsSold.toLocaleString(),
      change: '+0%',
      trend: 'up',
      description: 'Total de sesiones',
      detail: 'Últimos 30 días',
    },
    {
      title: 'Tasa de Crecimiento',
      value: `${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate.toFixed(1)}%`,
      change: `${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate.toFixed(1)}%`,
      trend: stats.growthRate >= 0 ? 'up' : 'down',
      description: stats.growthRate >= 0 ? 'Rendimiento positivo' : 'Rendimiento negativo',
      detail: 'Comparado con mes anterior',
    },
  ];

  // Preparar datos del gráfico según el rango de tiempo seleccionado
  const getChartData = () => {
    if (timeRange === '7days') {
      return stats.chartData.slice(-7);
    } else if (timeRange === '30days') {
      // Agrupar por semana si hay más de 7 días
      return stats.chartData;
    } else {
      // 3 meses - agrupar por mes
      return stats.chartData;
    }
  };

  const displayChartData = getChartData();
  const maxValue = Math.max(...displayChartData.map((d: { date: string; value: number }) => d.value), 1);
  const chartHeight = 300;
  const chartWidth = 1000;

  // Generar puntos para el gráfico SVG
  const generateChartPath = () => {
    if (displayChartData.length === 0) return '';
    const points = displayChartData.map((item: { date: string; value: number }, index: number) => {
      const x = (index / (displayChartData.length - 1)) * chartWidth;
      const y = chartHeight - (item.value / maxValue) * (chartHeight - 50) - 25;
      return { x, y };
    });

    const pathData = points.map((p: { x: number; y: number }, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return pathData;
  };

  const generateAreaPath = () => {
    const linePath = generateChartPath();
    if (!linePath) return '';
    const lastPoint = displayChartData.length > 0
      ? ((displayChartData.length - 1) / (displayChartData.length - 1)) * chartWidth
      : chartWidth;
    return `${linePath} L ${lastPoint} ${chartHeight} L 0 ${chartHeight} Z`;
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Métricas principales */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader>
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className='text-2xl font-semibold'>{metric.value}</CardTitle>
              <CardAction>
                <Badge variant='outline'>
                  {metric.trend === 'up' ? (
                    <>
                      <HugeiconsIcon icon={TradeUpIcon} strokeWidth={2} /> {metric.change}
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={TradeDownIcon} strokeWidth={2} /> {metric.change}
                    </>
                  )}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className='flex flex-col gap-1 items-start'>
              <span className='font-medium'>
                {metric.description}
                {metric.trend === 'up' ? (
                  <HugeiconsIcon className='inline-flex size-4 ml-1' icon={TradeUpIcon} strokeWidth={2} />
                ) : (
                  <HugeiconsIcon className='inline-flex size-4 ml-1' icon={TradeDownIcon} strokeWidth={2} />
                )}
              </span>
              <span className='text-muted-foreground'>
                {metric.detail}
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>
      {/* Gráfico de ingresos */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Totales</CardTitle>
          <CardDescription>Total de los últimos 7 días</CardDescription>
          <CardAction>
            <Tabs value={timeRange} onValueChange={setTimeRange} className='w-auto'>
              <TabsList>
                <TabsTrigger value='7days'>Últimos 7 días</TabsTrigger>
                <TabsTrigger value='30days'>Últimos 30 días</TabsTrigger>
                <TabsTrigger value='3months'>Últimos 3 meses</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Gráfico de área con datos reales */}
          <div className='h-[300px] w-full'>
            {displayChartData.length > 0 ? (
              <>
                <svg className='w-full h-full' viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <defs>
                    <linearGradient id='areaGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
                      <stop offset='0%' stopColor='#6366f1' stopOpacity='0.3' />
                      <stop offset='100%' stopColor='#6366f1' stopOpacity='0' />
                    </linearGradient>
                  </defs>
                  {/* Área */}
                  <path
                    d={generateAreaPath()}
                    fill='url(#areaGradient)'
                  />
                  {/* Línea */}
                  <path
                    d={generateChartPath()}
                    fill='none'
                    stroke='#6366f1'
                    strokeWidth='2'
                  />
                  {/* Puntos */}
                  {displayChartData.map((item: { date: string; value: number }, index: number) => {
                    const x = (index / (displayChartData.length - 1)) * chartWidth;
                    const y = chartHeight - (item.value / maxValue) * (chartHeight - 50) - 25;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r='4'
                        fill='#6366f1'
                        className='drop-shadow-md'
                      />
                    );
                  })}
                </svg>
                {/* Etiquetas del eje X */}
                <div className='flex justify-between mt-2 text-xs text-muted-foreground px-4'>
                  {displayChartData.map((item: { date: string; value: number }, i: number) => (
                    <span key={i}>{item.date}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className='flex items-center justify-center h-full text-muted-foreground'>
                No hay datos para mostrar
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Tabla de sesiones recientes */}
      <div className='space-y-6'>
        <div>
          <Tabs>
            <TabsList>
              <TabsTrigger value='7days'>Últimos 7 días</TabsTrigger>
              <TabsTrigger value='30days'>Últimos 30 días</TabsTrigger>
              <TabsTrigger value='3months'>Últimos 3 meses</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted'>
              <TableRow>
                <TableHead>Sesión</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className='text-right'>Total</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center text-muted-foreground py-8'>
                    No hay sesiones recientes
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentSessions.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className='font-medium'>{item.header}</TableCell>
                    <TableCell className='text-muted-foreground'>
                      {item.type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'Done' ? 'secondary' : 'outline'
                        }
                      >
                        {item.status === 'Done' ? 'Finalizada' : 'En curso'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.reviewer}</TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(item.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant='ghost' size='icon-sm'>
                            <HugeiconsIcon icon={MoreHorizontalIcon} className='size-4' strokeWidth={2} />
                          </Button>
                        } />
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {stats.recentSessions.length > 0 && (
        <div className='flex items-center justify-between mt-4 text-sm text-muted-foreground'>
          <div>Mostrando {stats.recentSessions.length} sesión(es) reciente(s)</div>
        </div>
      )}
    </div>
  );
}
