<?xml version="1.0" encoding="UTF-8"?>
<!-- produces table cells to hold the endings in inflection ending set, grouped by ending
     type (e.g. regular, irregular). Each type gets its own cell.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    
    <xsl:template name="ending-cell">
        <xsl:param name="infl-endings"/>
        <xsl:param name="selected_endings"/>
        <xsl:param name="selected"/>
        <xsl:param name="translit_ending_table_match" />
        <xsl:param name="dedupe_by"/>
        <xsl:param name="show_only_matches"/>
        <xsl:param name="match_form"/>

        <xsl:element name="td"><!-- start new cell -->
            <xsl:attribute name="class">ending-group</xsl:attribute> 
            <xsl:if test="$infl-endings/@pers">
                <xsl:attribute name="alph-pers">
                    <xsl:value-of select="concat('|', translate($infl-endings/@pers,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@gend">
                <xsl:attribute name="alph-gend">
                    <xsl:value-of select="concat('|', translate($infl-endings/@gend,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@num">
                <xsl:attribute name="alph-num">
                    <xsl:value-of select="concat('|', translate($infl-endings/@num,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@case">
                <xsl:attribute name="alph-case">
                    <xsl:value-of select="concat('|', translate($infl-endings/@case,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@voice">
                <xsl:attribute name="alph-voice">
                    <xsl:value-of select="concat('|', translate($infl-endings/@voice,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@tense">
                <xsl:attribute name="alph-tense">
                    <xsl:value-of select="concat('|', translate($infl-endings/@tense,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@mood">
                <xsl:attribute name="alph-mood">
                    <xsl:value-of select="concat('|', translate($infl-endings/@mood,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@conj">
                <xsl:attribute name="alph-conj">
                    <xsl:value-of select="concat('|', translate($infl-endings/@conj,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="$infl-endings/@hdwd">
                <xsl:attribute name="alph-hdwd">
                    <xsl:value-of select="concat('|', translate($infl-endings/@hdwd,' ','|'), '|')"/>
                </xsl:attribute>
            </xsl:if>    
            <xsl:variable name="cellgroup" select="$infl-endings/infl-ending"/>
            <xsl:if test="count($cellgroup) = 0">
                <span class="emptycell"/>
            </xsl:if>
        <xsl:for-each select="$cellgroup">
            <!-- if we have primary endings identified, then include only the primary endings, otherwise
                 include them all -->
            <xsl:variable name="has_primary" select="count(../infl-ending[contains(@type,'primary')])"/>
            <xsl:if test="($has_primary &gt; 0 and contains(@type,'primary')) or not($has_primary)">
                <xsl:variable name="stripped-ending">
                    <xsl:choose>
                        <!-- if requested, transliterate the ending in the table for matching -->
                        <xsl:when test="$translit_ending_table_match">
                            <xsl:call-template name="uni-to-ascii">
                                <xsl:with-param name="input" select="."/>
                            </xsl:call-template>
                        </xsl:when>
                        <!-- otherwise use the ending as-is -->
                        <xsl:otherwise>
                            <xsl:value-of select="."/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <!-- underscore and hyphen in the declension tables match on no ending -->
                <xsl:variable name="ending_match">
                    <xsl:choose>
                        <xsl:when test="$stripped-ending = '_' or $stripped-ending = '-'">_</xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="normalize-space($stripped-ending)"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="notfirst">
                    <xsl:if test="position() &gt; 1">notfirst</xsl:if>
                </xsl:variable>
                <xsl:variable name="this_case" select="../@case"/>
                <xsl:variable name="this_num" select="../@num"/>
                <xsl:variable name="this_gend" select="../@gend"/>
                <xsl:element name="span">
                    <xsl:attribute name="class">
                        <xsl:value-of select="concat('ending ', @type, ' ',' ', $notfirst)"/>
                    </xsl:attribute>
                    <xsl:attribute name="stem-class">
                        <xsl:value-of select="@stem-class"/>
                    </xsl:attribute>
                    <xsl:value-of select="."/>
                </xsl:element>
            </xsl:if>
        </xsl:for-each>
        </xsl:element>                                   
    </xsl:template>
    

</xsl:stylesheet>