"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = {
    mode?: "single"
    selected?: Date
    onSelect?: (date: Date | undefined) => void
    className?: string
    initialFocus?: boolean
    disabled?: (date: Date) => boolean
}

const DAYS = ["D", "L", "M", "M", "J", "V", "S"] // Domingo, Lunes, Martes, Miércoles, Jueves, Viernes, Sábado
const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

function Calendar({
    mode = "single",
    selected,
    onSelect,
    className,
    ...props
}: CalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // Generate year options (current year ± 10 years)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sunday

    // Generate calendar days
    const days: (number | null)[] = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1))
    }

    const handleMonthChange = (value: string) => {
        setCurrentMonth(new Date(year, parseInt(value), 1))
    }

    const handleYearChange = (value: string) => {
        setCurrentMonth(new Date(parseInt(value), month, 1))
    }

    const handleDayClick = (day: number) => {
        const newDate = new Date(year, month, day)
        onSelect?.(newDate)
    }

    const isSelected = (day: number) => {
        if (!selected) return false
        return (
            selected.getDate() === day &&
            selected.getMonth() === month &&
            selected.getFullYear() === year
        )
    }

    const isToday = (day: number) => {
        const today = new Date()
        return (
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year
        )
    }

    const isDisabled = (day: number) => {
        if (!props.disabled) return false
        const dateToCheck = new Date(year, month, day)
        return props.disabled(dateToCheck)
    }

    return (
        <div className={cn("p-4", className)}>
            {/* Header with month/year selectors */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePrevMonth}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-2">
                    <Select value={month.toString()} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((monthName, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                    {monthName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[90px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={y.toString()}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNextMonth}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Calendar grid */}
            <div className="w-full">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                    {DAYS.map((day, index) => (
                        <div
                            key={index}
                            className="h-10 flex items-center justify-center text-sm font-medium text-muted-foreground"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                        const disabled = day ? isDisabled(day) : false
                        return (
                            <div key={index} className="h-10 flex items-center justify-center">
                                {day ? (
                                    <button
                                        onClick={() => !disabled && handleDayClick(day)}
                                        disabled={disabled}
                                        className={cn(
                                            "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-colors",
                                            disabled ? "text-muted-foreground opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
                                            isSelected(day) && !disabled && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                            isToday(day) && !isSelected(day) && !disabled && "border border-primary",
                                            !isSelected(day) && !isToday(day) && !disabled && "text-foreground"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ) : (
                                    <div className="h-9 w-9" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

Calendar.displayName = "Calendar"

export { Calendar }
